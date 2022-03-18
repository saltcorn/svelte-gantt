const Field = require("@saltcorn/data/models/field");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const View = require("@saltcorn/data/models/view");
const Workflow = require("@saltcorn/data/models/workflow");

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
} = require("@saltcorn/markup/tags");
const {
  readState,
  stateFieldsToWhere,
} = require("@saltcorn/data//plugin-helper");

const moment = require("moment"); // require

const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "views",
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
          return new Form({
            fields: [
              {
                name: "title_field",
                label: "Title field",
                type: "String",
                sublabel: "Event label displayed on the task.",
                required: true,
                attributes: {
                  options: fields
                    .filter((f) => f.type.name === "String")
                    .map((f) => f.name),
                },
              },
              {
                name: "row_field",
                label: "Row field",
                type: "String",
                sublabel: "Field indicating the row",
                required: true,
                attributes: {
                  options: fields.map((f) => f.name),
                },
              },
              {
                label: "Allow move between rows",
                name: "move_between_rows",
                type: "Bool",
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
              {
                name: "color_field",
                label: "Color field",
                type: "String",
                attributes: {
                  options: colour_options,
                },
              },
              {
                name: "Allow move between rows",
                label: "move_between_row",
                type: "Bool",
              },
            ],
          });
        },
      },
    ],
  });

const get_state_fields = async (table_id, viewname, { show_view }) => {
  const table_fields = await Field.find({ table_id });
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
    start_field,
    duration_field,
    duration_units,
    title_field,
    row_field,
    end_field,
    color_field,
    move_between_rows,
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
    : 10;
  const qstate = await stateFieldsToWhere({ fields, state });

  if (state[`_fromdate_${start_field}`] && state[`_todate_${start_field}`]) {
    const from = new Date(state[`_fromdate_${start_field}`]);
    const to = new Date(state[`_todate_${start_field}`]);
    qstate.or = [
      { [start_field]: [{ gt: from }, { lt: to }] },
      { [end_field]: [{ gt: from }, { lt: to }] },
      {
        [start_field]: { lt: from },
        [end_field]: { gt: to },
      },
    ];
    delete qstate[start_field];
  }
  console.log(qstate);
  const joinFields = {};
  if (row_fld.is_fkey) {
    joinFields[`summary_field_${row_fld.name}`] = {
      ref: row_fld.name,
      target: row_fld.attributes.summary_field,
    };
  }
  if (color_field && color_field.includes(".")) {
    joinFields[`_color`] = {
      ref: color_field.split(".")[0],
      target: color_field.split(".")[1],
    };
  }
  const dbrows = await table.getJoinedRows({
    where: qstate,
    joinFields,
  });
  const chart_rows = {};
  if (
    row_fld.is_fkey ||
    (row_fld.type.name === "String" &&
      row_fld.attributes &&
      row_fld.attributes.options)
  ) {
    const vals = await row_fld.distinct_values();
    vals.forEach(({ label, value }) => {
      chart_rows[value] = {
        id: value,
        label,
      };
    });
  }
  const colors = new Set();
  let first_start, last_end;
  const tasks = dbrows.map((r) => {
    if (!chart_rows[r[row_field]]) {
      chart_rows[r[row_field]] = {
        id: r[row_field],
        label: row_fld.is_fkey
          ? r[`summary_field_${row_fld.name}`]
          : r[row_field],
      };
    }
    const to =
      duration_field && r[duration_field]
        ? moment(r[start_field]).add(
            r[duration_field],
            duration_units.toLowerCase()
          )
        : end_field && r[end_field]
        ? r[end_field]
        : moment(r[start_field]).add(1, "hour");
    if (!first_start || r[start_field] < first_start)
      first_start = r[start_field];
    if (!last_end || to > last_end) last_end = to;

    const task = {
      id: r.id,
      resourceId: r[row_field],
      label: r[title_field],
      from: r[start_field],
      to,
    };
    if (color_field && (r[color_field] || color_field.includes("."))) {
      const color = r[
        color_field.includes(".") ? "_color" : color_field
      ].substr(1, 6);
      colors.add(color);
      task.classes = `color-${color}`;
    }
    return task;
  });
  if (state[`_fromdate_${start_field}`])
    first_start = new Date(state[`_fromdate_${start_field}`]);
  if (state[`_todate_${start_field}`])
    last_end = new Date(state[`_todate_${start_field}`]);
  var spanDays = moment(last_end).diff(first_start, "days");
  console.log({ spanDays, first_start, last_end });
  const spanProps =
    spanDays > 14
      ? {
          columnOffset: 1,
          columnUnit: "day",
          magnetUnit: "day",
          magnetOffset: 1,
          headers: [
            { unit: "day", format: "MM", offset: Math.ceil(spanDays / 10) },
          ],
        }
      : {
          columnOffset: 30,
          columnUnit: "minute",
          magnetUnit: "minute",
          magnetOffset: 15,
          headers: [
            { unit: "day", format: "MMMM Do" },
            ...(spanDays < 5
              ? [{ unit: "hour", format: "H:mm", offset: Math.ceil(spanDays) }]
              : []),
          ],
        };
  //console.log(Object.values(chart_rows));
  //console.log(colors);
  return (
    div({ id: "example-gantt" }) +
    style(
      [...colors].map((c) => `.color-${c} {background-color: #${c}}`).join("\n")
    ) +
    script(
      domReady(`
      const tasks = ${JSON.stringify(
        tasks
      )}.map(t=>{t.from = new Date(t.from); t.to = new Date(t.to); return t});
      console.log(tasks)
      const gantt = new SvelteGantt({ 
    target: document.getElementById('example-gantt'), 
    props: {
      tasks,
      rows:${JSON.stringify(Object.values(chart_rows))},
      from: new Date(${JSON.stringify(first_start)}),
      to: new Date(${JSON.stringify(last_end)}),      
      rowHeight: 52,
      rowPadding: 6,
      fitWidth: true,
      tableHeaders: [{ title: '${
        row_fld.label
      }', property: 'label', width: 140, type: 'tree' }],
      tableWidth: 240,
      ganttTableModules: [SvelteGanttTable],
      ...${JSON.stringify(spanProps)}
    }});
    gantt.api.tasks.on.changed((task) => 
    view_post('${viewname}', 'change_task', task));
    `)
    )
  );
};

const change_task = async (
  table_id,
  viewname,
  {
    start_field,
    duration_field,
    duration_units,
    title_field,
    row_field,
    end_field,
    color_field,
    move_between_rows,
  },
  tasks,
  { req }
) => {
  const model = tasks[0].task.model;
  //console.log(tasks[0]);
  const table = await Table.findOne({ id: table_id });
  const role = req.isAuthenticated() ? req.user.role_id : 10;
  if (role > table.min_role_write) {
    return { json: { error: "not authorized" } };
  }
  const start = new Date(tasks[0].task.model.from);
  const end = new Date(tasks[0].task.model.to);
  const updRow = {
    [start_field]: start,
  };

  if (end_field) updRow[end_field] = end;
  if (duration_field)
    updRow[duration_field] = moment(end).diff(
      start,
      duration_units.toLowerCase()
    );
  if (move_between_rows) updRow[row_field] = tasks[0].targetRow.model.id;
  await table.updateRow(updRow, model.id);
  return { json: { success: "ok" } };
};

module.exports = {
  headers: [
    {
      script: "/plugins/public/svelte-gantt/index.iife.js",
    },
  ],
  sc_plugin_api_version: 1,
  plugin_name: "svelte-gantt",
  viewtemplates: [
    {
      name: "Gantt chart",
      display_state_form: false,
      get_state_fields,
      configuration_workflow,
      run,
      routes: { change_task },
    },
  ],
};

//edit with popup
//crash on drag
//dependencies
//row order
//tree - task str opts, task fkey, task self-join,
