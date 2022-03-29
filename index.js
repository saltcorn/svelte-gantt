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
  button,
} = require("@saltcorn/markup/tags");
const {
  readState,
  stateFieldsToWhere,
} = require("@saltcorn/data//plugin-helper");
const { features } = require("@saltcorn/data/db/state");

const moment = require("moment"); // require

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
                name: "dependency_table",
                label: "Dependency table",
                type: "String",
                attributes: {
                  options: [...dependency_table_opts],
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
                name: "milestone_field",
                label: "Milestone field",
                type: "String",
                attributes: {
                  options: fields
                    .filter((f) => f.type.name === "Bool")
                    .map((f) => f.name),
                },
              },
              {
                name: "Allow move between rows",
                label: "move_between_row",
                type: "Bool",
              },
              {
                name: "edit_view",
                label: "Edit view",
                type: "String",
                required: false,
                attributes: {
                  options: edit_view_opts,
                },
              },
            ],
          });
        },
      },
      {
        name: "Row order",
        form: async (context) => {
          console.log(context);
          const table = await Table.findOne({ id: context.table_id });
          const fields = await table.getFields();
          const row_field = fields.find((f) => f.name === context.row_field);
          const order_options = fields.map((f) => f.name);
          if (row_field?.is_fkey) {
            const reftable = Table.findOne({
              name: row_field.reftable_name,
            });
            const reffields = await reftable.getFields();
            reffields.forEach((f) =>
              order_options.push(`${row_field.name}.${f.name}`)
            );
          }
          let dependency_field_opts;
          if (context.dependency_table) {
            const deptable = await Table.findOne({
              name: context.dependency_table,
            });
            const depfields = await deptable.getFields();
            dependency_field_opts = depfields
              .filter((f) => f.reftable_name === table.name)
              .map((f) => f.name);
          }
          return new Form({
            fields: [
              {
                name: "row_order_field",
                label: "Row order field",
                type: "String",
                attributes: {
                  options: order_options,
                },
              },
              {
                name: "row_order_descending",
                label: "Descending order",
                type: "Bool",
              },
              ...(dependency_field_opts
                ? [
                    {
                      name: "dependency_from_field",
                      label: "Dependency from field",
                      type: "String",
                      required: true,
                      attributes: {
                        options: dependency_field_opts,
                      },
                    },
                    {
                      name: "dependency_to_field",
                      label: "Dependency to field",
                      type: "String",
                      required: true,
                      attributes: {
                        options: dependency_field_opts,
                      },
                    },
                  ]
                : []),
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
    milestone_field,
    move_between_rows,
    edit_view,
    row_order_field,
    row_order_descending,
    dependency_table,
    dependency_from_field,
    dependency_to_field,
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

  if (
    state[`_fromdate_${start_field}`] &&
    state[`_todate_${start_field}`] &&
    features?.prefix_or_in_queries
  ) {
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
  if (row_order_field && row_order_field.includes(".")) {
    joinFields[`_order`] = {
      ref: row_order_field.split(".")[0],
      target: row_order_field.split(".")[1],
    };
  }
  const dbrows = await table.getJoinedRows({
    where: qstate,
    joinFields,
    orderBy: (row_order_field || "").includes(".") ? "_order" : row_order_field,
    orderDesc: row_order_descending,
  });
  const chart_rows = {};
  let row_id_lookup_array;
  if (row_fld.type?.name === "String" && row_fld?.attributes?.options) {
    row_id_lookup_array = row_fld.attributes.options
      .split(",")
      .map((s) => s.trim());
    row_id_lookup_array.push("");
  }
  const row_id_lookup = (id) =>
    row_id_lookup_array ? row_id_lookup_array.indexOf(id) + 1 : id;

  const colors = new Set();
  let first_start, last_end;
  const tasks = dbrows.map((r) => {
    if (!chart_rows[`r${r[row_field]}`]) {
      chart_rows[`r${r[row_field]}`] = {
        id: row_id_lookup(r[row_field]),
        enableDragging: !!move_between_rows,
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
      resourceId: row_id_lookup(r[row_field]),
      label: r[title_field],
      enableDragging: !!move_between_rows,
      showButton: !!edit_view,
      from: r[start_field],
      to,
    };
    if (edit_view) task.buttonHtml = '<i class="ms-2 p-1 fas fa-edit"></i>';
    if (color_field && (r[color_field] || color_field.includes("."))) {
      const color = r[
        color_field.includes(".") ? "_color" : color_field
      ].substr(1, 6);
      colors.add(color);
      task.classes = `color-${color}`;
    }
    if (milestone_field && r[milestone_field]) {
      if (task.classes) task.classes = `${task.classes} milestone`;
      else task.classes = `milestone`;
    }
    return task;
  });

  if (
    row_fld.is_fkey ||
    (row_fld.type.name === "String" &&
      row_fld.attributes &&
      row_fld.attributes.options)
  ) {
    const vals = await row_fld.distinct_values();
    vals.forEach(({ label, value }) => {
      if (!chart_rows[`r${value}`])
        chart_rows[`r${value}`] = {
          id: row_id_lookup(value),
          enableDragging: !!move_between_rows,
          label,
        };
    });
  }
  if (state[`_fromdate_${start_field}`])
    first_start = new Date(state[`_fromdate_${start_field}`]);
  if (state[`_todate_${start_field}`])
    last_end = new Date(state[`_todate_${start_field}`]);
  var spanDays = moment(last_end).diff(first_start, "days");
  const spanProps =
    spanDays > 240
      ? {
          columnOffset: 14,
          columnUnit: "day",
          magnetUnit: "day",
          magnetOffset: 1,
          headers: [
            { unit: "day", format: "MM", offset: Math.ceil(spanDays / 10) },
          ],
        }
      : spanDays > 14
      ? {
          columnOffset: 1,
          columnUnit: "day",
          magnetUnit: "day",
          magnetOffset: 1,
          headers: [
            { unit: "day", format: "MM", offset: Math.ceil(spanDays / 10) },
          ],
        }
      : spanDays > 7
      ? {
          columnOffset: 1,
          columnUnit: "day",
          magnetUnit: "day",
          magnetOffset: 1,
          headers: [
            { unit: "day", format: "MM", offset: Math.ceil(spanDays / 5) },
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
              ? [
                  {
                    unit: "hour",
                    format: "H:mm",
                    offset: Math.ceil(spanDays * 2),
                  },
                ]
              : []),
          ],
        };
  let dependencies = [];
  if (dependency_table && dependency_from_field && dependency_to_field) {
    const myIds = tasks.map((t) => t.id);
    const deptable = await Table.findOne({
      name: dependency_table,
    });
    const deps = await deptable.getRows({
      [dependency_from_field]: { in: myIds },
      [dependency_to_field]: { in: myIds },
    });
    dependencies = deps.map((d) => ({
      id: d.id,
      fromId: d[dependency_from_field],
      toId: d[dependency_to_field],
    }));
    console.log(deps);
  }
  return (
    (dependency_table && dependency_from_field && dependency_to_field
      ? button(
          {
            class: "btn btn-sm btn-primary add-dependency ms-2",
            onClick: "gantt_add_dependency()",
            disabled: true,
          },
          "Add dependency"
        )
      : "") +
    div({ id: "example-gantt" }) +
    style(
      [...colors]
        .map((c) => `.color-${c} {background-color: #${c}}`)
        .join("\n") +
        `
        .milestone { transform: rotate(45deg);
          transform-origin: center center;  }
        .milestone .sg-task-content {
           color:black;
         }`
    ) +
    script(
      domReady(`
      const tasks = ${JSON.stringify(
        tasks,
        null,
        2
      )}.map(t=>{t.from = new Date(t.from); t.to = new Date(t.to); return t});
      //console.log(tasks)
      const gantt = new SvelteGantt({ 
    target: document.getElementById('example-gantt'), 
    props: {
      tasks,
      rows:${JSON.stringify(Object.values(chart_rows), null, 2)},
      from: new Date(${JSON.stringify(first_start)}),
      to: new Date(${JSON.stringify(last_end)}),      
      rowHeight: 52,
      rowPadding: 6,
      fitWidth: true,
      ${
        edit_view
          ? `onTaskButtonClick: (task) => { ajax_modal('/view/${edit_view}?id='+task.id) },`
          : ""
      }
      tableHeaders: [{ title: '${
        row_fld.label
      }', property: 'label', width: 140, type: 'tree' }],
      tableWidth: 240,
      ganttTableModules: [SvelteGanttTable],
      dependencies: ${JSON.stringify(dependencies)},
      ganttBodyModules : [SvelteGanttDependencies],
      ...${JSON.stringify(spanProps)},
    }});
    gantt.api.tasks.on.changed((task) => 
      view_post('${viewname}', 'change_task', task));
    let lastSelected, prevSelected;
    gantt.api.tasks.on.select((tasks) => {
      prevSelected = lastSelected;
      lastSelected =  tasks[0]?.model?.id
      if(prevSelected && lastSelected) {
         $('.btn.add-dependency').prop('disabled', false);
      }
    });
    setTimeout(()=>{
      $('.milestone').each(function() {
        const tr = $(this).css('transform')
        const h = $(this).height()
        //console.log()
        $(this).css('transform',tr+' rotate(45deg)' )
        $(this).width(h);
        $(this).attr("title", $(this).find(".sg-task-content").text() )
        $(this).find(".sg-task-content").css({transform: 'rotate(-45deg) translate('+(h*1.25)+'px, '+(-h/2)+'px)'})

      })
    })
    window.gantt_add_dependency= ()=>{
      view_post('${viewname}', 'add_dependency', {from: prevSelected, to: lastSelected});
    }
    `)
    )
  );
};

const add_dependency = async (
  table_id,
  viewname,
  { dependency_table, dependency_from_field, dependency_to_field },
  { from, to },
  { req }
) => {
  //console.log(tasks[0]);
  const table = await Table.findOne({ id: table_id });
  const fields = await table.getFields();
  const deptable = await Table.findOne({
    name: dependency_table,
  });

  await deptable.tryInsertRow({
    [dependency_from_field]: from,
    [dependency_to_field]: to,
  });
  return { json: { success: "ok" } };
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
  const fields = await table.getFields();
  const row_fld = fields.find((f) => f.name === row_field);
  let row_id_lookup_array;
  if (row_fld.type?.name === "String" && row_fld?.attributes?.options) {
    row_id_lookup_array = row_fld.attributes.options
      .split(",")
      .map((s) => s.trim());
    row_id_lookup_array.push("");
  }
  const row_id_lookup = (id) =>
    row_id_lookup_array ? row_id_lookup_array[id - 1] : id;

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

  if (move_between_rows)
    updRow[row_field] = row_id_lookup(tasks[0].targetRow.model.id);
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
      routes: { change_task, add_dependency },
    },
  ],
};

//crash on drag
//dependencies
//tree - task str opts, task fkey, task self-join,
