const Field = require("@saltcorn/data/models/field");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const View = require("@saltcorn/data/models/view");
const Workflow = require("@saltcorn/data/models/workflow");
const {
  eval_expression,
  freeVariables,
} = require("@saltcorn/data/models/expression");

const {
  text,
  div,
  h5,
  style,
  a,
  script,
  pre,
  domReady,
  i,
  text_attr,
  button,
  input,
  label,
} = require("@saltcorn/markup/tags");
const {
  readState,
  stateFieldsToWhere,
  add_free_variables_to_joinfields,
} = require("@saltcorn/data/plugin-helper");
const { features } = require("@saltcorn/data/db/state");
const public_user_role = features?.public_user_role || 10;

const moment = require("moment"); // require
const { calcSpanProps } = require("./common");

const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "Views and fields",
        form: async (context) => {
          const table = await Table.findOne({ id: context.table_id });
          const fields = await table.getFields();
          const colour_options = fields
            .filter((f) => f.type.name === "Color")
            .map((f) => f.name);
          for (const field of fields) {
            if (field.is_fkey) {
              const reftable = Table.findOne({
                name: field.reftable_name,
              });
              const reffields = await reftable.getFields();
              reffields
                .filter((f) => f.type.name === "Color")
                .forEach((f) => colour_options.push(`${field.name}.${f.name}`));
            }
          }
          const edit_views = await View.find_table_views_where(
            context.table_id,
            ({ state_fields, viewtemplate, viewrow }) =>
              viewrow.name !== context.viewname
          );
          const edit_view_opts = edit_views.map((v) => v.name);
          const { child_field_list, child_relations } =
            await table.get_child_relations();
          const dependency_table_opts = new Set();
          child_relations.forEach(({ table }) =>
            dependency_table_opts.add(table.name)
          );
          return new Form({
            fields: [
              {
                name: "row_field",
                label: "Row field",
                type: "String",
                sublabel: "Field indicating the row (resource to track)",
                required: true,
                attributes: {
                  options: fields.map((f) => f.name),
                },
              },
              {
                name: "row_label_formula",
                label: "Row label formula",
                class: "validate-expression",
                type: "String",
                sublabel: "Leave blank to use row field",
              },
              {
                name: "start_field",
                label: "Start time field",
                type: "String",
                sublabel:
                  "The table needs a fields of type 'Date' to track start times.",
                required: true,
                attributes: {
                  options: fields
                    .filter((f) => f.type.name === "Date")
                    .map((f) => f.name),
                },
              },
              {
                name: "end_field",
                label: "End time field",
                type: "String",
                sublabel:
                  "Specify an end field of type 'Date' or a duration field",
                required: false,
                attributes: {
                  options: fields
                    .filter((f) => f.type.name === "Date")
                    .map((f) => f.name),
                },
              },

              {
                name: "duration_field",
                label: "Duration field",
                type: "String",
                sublabel:
                  "A fields of type 'Int' or 'Float' to denote the duration of the event.",
                required: false,
                attributes: {
                  options: fields
                    .filter(
                      (f) =>
                        f.type.name === "Integer" || f.type.name === "Float"
                    )
                    .map((f) => f.name),
                },
              },
              {
                name: "duration_units",
                label: "Duration units",
                type: "String",
                sublabel: "Units of duration field, if specified",
                required: true,
                attributes: {
                  options: "Seconds,Minutes,Hours,Days",
                },
              },
            ],
          });
        },
      },
    ],
  });

const get_state_fields = async (table_id, viewname, { show_view }) => {
  const table = Table.findOne(table_id);
  const table_fields = table.fields;
  return table_fields
    .filter((f) => !f.primary_key)
    .map((f) => {
      const sf = new Field(f);
      sf.required = false;
      return sf;
    });
};
const run = async (
  table_id,
  viewname,
  {
    row_field,
    row_label_formula,
    start_field,
    end_field,
    duration_field,
    duration_units,
  },
  state,
  extraArgs
) => {
  const table = await Table.findOne({ id: table_id });
  const fields = await table.getFields();
  const row_fld = fields.find((f) => f.name === row_field);
  readState(state, fields);

  const role = extraArgs.req.isAuthenticated()
    ? extraArgs.req.user.role_id
    : public_user_role;
  const qstate = await stateFieldsToWhere({ fields, state });
  if (
    state[`_fromdate_${start_field}`] &&
    state[`_todate_${start_field}`] &&
    features?.prefix_or_in_queries
  ) {
    const from = new Date(state[`_fromdate_${start_field}`]);
    const to = new Date(state[`_todate_${start_field}`]);
    if (end_field)
      qstate.or = [
        { [start_field]: [{ gt: from }, { lt: to }] },
        { [end_field]: [{ gt: from }, { lt: to }] },
        {
          [start_field]: { lt: from },
          [end_field]: { gt: to },
        },
      ];
    else if (duration_field) qstate[start_field] = [{ gt: from }, { lt: to }];
    delete qstate[start_field];
  }
  let get_row_from_task = (r) => r[row_field];
  const joinFields = {};
  if (row_fld.is_fkey) {
    joinFields[`summary_field_${row_fld.name}`] = {
      ref: row_fld.name,
      target: row_fld.attributes.summary_field,
    };
    get_row_from_task = (r) => r[`summary_field_${row_fld.name}`];
  }
  if (row_label_formula && add_free_variables_to_joinfields) {
    add_free_variables_to_joinfields(
      freeVariables(row_label_formula),
      joinFields,
      fields
    );
    get_row_from_task = (r) => eval_expression(row_label_formula, r);
  }

  const tasks = await table.getJoinedRows({
    where: qstate,
    joinFields,
    //orderBy: (row_order_field || "").includes(".") ? "_order" : row_order_field,
    //orderDesc: row_order_descending,
  });

  //figure out timescale, resource tracker division
  let first_start, last_end;
  tasks.forEach((r) => {
    const to =
      duration_field && r[duration_field]
        ? moment(r[start_field]).add(
            r[duration_field],
            duration_units.toLowerCase()
          )
        : end_field && r[end_field]
        ? r[end_field]
        : moment(r[start_field]).add(1, "hour");
    if (r[start_field] && (!first_start || r[start_field] < first_start))
      first_start = r[start_field];
    if (!last_end || to > last_end) last_end = to;
    r._to = to;
  });

  //console.log(tasks, first_start);
  if (state[`_fromdate_${start_field}`])
    first_start = new Date(state[`_fromdate_${start_field}`]);
  if (state[`_todate_${start_field}`])
    last_end = new Date(state[`_todate_${start_field}`]);
  var spanDays = moment(last_end).diff(first_start, "days");
  var spanMonths = moment(last_end).diff(first_start, "months");
  //console.log({ spanDays, spanMonths });
  const spanProps = calcSpanProps(spanMonths, spanDays);
  const columnUnit =
    /*spanProps.headers?.length > 1
    ? spanProps.headers[1].unit
    : */ spanProps.columnUnit;
  const ndivisions = moment(last_end).diff(moment(first_start), columnUnit);
  console.log({ ndivisions, first_start, last_end });
  const resourceMap = {};

  tasks.forEach((r) => {
    const id = r[row_field];
    if (!resourceMap[id])
      resourceMap[id] = {
        id,
        label: get_row_from_task(r),
        enableDragging: false,
      };
  });
  const resources = Object.values(resourceMap);
  let resTasks = [];
  resources.forEach((res) => {
    const divisions = Array(ndivisions).fill(0);
    tasks
      .filter((r) => r[row_field] === res.id)
      .forEach((r) => {
        const startIx = moment(r[start_field]).diff(
          moment(first_start),
          columnUnit
        );
        const endIx = moment(r._to).diff(moment(first_start), columnUnit);
        console.log({ startIx, endIx });
        for (let i = startIx; i < endIx; i++) divisions[i]++;
      });
    let resTaskIdCounter = 1;
    for (let i = 0; i < ndivisions; i++)
      if (divisions[i] > 0)
        resTasks.push({
          resourceId: res.id,
          id: resTaskIdCounter++,
          label: divisions[i],
          from: moment(first_start).add(i, columnUnit),
          to: moment(first_start).add(i + 1, columnUnit),
          classes: `nresources-${divisions[i]}`,
          enableDragging: false,
        });
  });
  let maxTaskCount = 0;
  resTasks.forEach((r) => {
    if (r.label > maxTaskCount) maxTaskCount = r.label;
  });
  const divid = `ganttres${Math.floor(Math.random() * 16777215).toString(16)}`;
  const taskCountToOpacity = (n) => n / maxTaskCount;
  return (
    style(
      [...Array(maxTaskCount).keys()]
        .map(
          (n) => `
    .nresources-${n + 1} {
      background-color: rgba(255, 0, 0, ${taskCountToOpacity(n + 1)});
    }`
        )
        .join("")
    ) +
    div(
      [...Array(maxTaskCount).keys()].map((n) =>
        div(
          {
            class: `nresources-${n + 1}`,
            style: {
              height: "30px",
              width: "30px",
              lineHeight: "30px",
              display: "inline-block",
              border: "1px solid black",
              textAlign: "center",
              verticalAlign: "middle",
            },
          },
          n + 1
        )
      )
    ) +
    div({ id: divid }) +
    script(
      domReady(`
    const rtasks = ${JSON.stringify(
      resTasks
    )}.map(t=>{t.from = new Date(t.from); t.to = new Date(t.to); return t});
    //console.log(tasks)
    
    const rganttRows= ${JSON.stringify(resources)};
    const rgantt = new SvelteGantt({ 
  target: document.getElementById('${divid}'), 
  props: {
    tasks: rtasks,
    rows:rganttRows,
    from: new Date(${JSON.stringify(first_start)}),
    to: new Date(${JSON.stringify(last_end)}),  
    dateAdapter: new MomentSvelteGanttDateAdapter(moment),    
    rowHeight: 52,
    rowPadding: 6,
    fitWidth: true,


    tableHeaders: [{ title: '${
      row_fld.label
    }', property: 'label', width: 140, type: 'tree' }],
    tableWidth: 240,
    ganttTableModules: [SvelteGanttTable],

   
    ...${JSON.stringify(spanProps)},
  }});`)
    )
  );
};
module.exports = {
  configuration_workflow,
  get_state_fields,
  run,
  name: "Gantt chart resources",
};

/* TODO

2. figure out timescale, resource tracker division
3. what are different rows? loop over them
   a. what are my tasks
   b. create arrays for time division counts
   b. loop/create over tasks, increment arrays
   c. turn arrays into tasks where non-zero
      

*/
