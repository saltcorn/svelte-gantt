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
                name: "description_field",
                label: "Description field",
                type: "String",
                sublabel: "Shown when the mouse hovers over the task",
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
                label: "Allow move within row",
                name: "move_within_row",
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
                name: "hide_empty_rows",
                label: "Hide empty rows",
                type: "Bool",
              },
              {
                name: "text_color",
                label: "Text color",
                type: "Color",
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
              {
                name: "add_on_row",
                label: "Add button on row",
                type: "Bool",
              },
            ],
          });
        },
      },
      {
        name: "Row order",
        form: async (context) => {
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
          let tree_field_options = [];
          if (row_field?.is_fkey) {
            const reftable = Table.findOne({
              name: row_field.reftable_name,
            });
            const reffields = await reftable.getFields();
            tree_field_options = reffields
              .filter((f) => f.is_fkey && f.reftable_name === reftable.name)
              .map((f) => f.name);
          } else {
            tree_field_options = fields
              .filter((f) => f.is_fkey && f.reftable_name === table.name)
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
              {
                name: "tree_field",
                label: "Tree field",
                type: "String",
                attributes: {
                  options: tree_field_options,
                },
              },
              {
                name: "reflectOnParentRows",
                label: "Reflect On Parent Rows",
                type: "Bool",
                showIf: { tree_field: tree_field_options },
              },
              {
                name: "focus_button",
                label: "Focus button",
                type: "Bool",
                showIf: { tree_field: tree_field_options },
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
    move_within_row,
    edit_view,
    row_order_field,
    row_order_descending,
    dependency_table,
    dependency_from_field,
    dependency_to_field,
    tree_field,
    hide_empty_rows,
    text_color,
    description_field,
    reflectOnParentRows,
    add_on_row,
    focus_button,
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
  let use_tree_field = tree_field;
  if (tree_field && row_fld.is_fkey) {
    joinFields[`_tree`] = {
      ref: row_field,
      target: tree_field,
    };
    use_tree_field = "_tree";
  }
  //console.log({ tree_field, use_tree_field });
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
  } else if (!row_fld.is_fkey && row_fld.type?.name !== "Integer") {
    row_id_lookup_array = [...new Set(dbrows.map((r) => r[row_field]))];
  }
  const row_id_lookup = (id) =>
    row_id_lookup_array ? row_id_lookup_array.indexOf(id) + 1 : id;

  const colors = new Set();
  let first_start, last_end;
  const row_id_order = [];

  const mkHeaderHtml = (label, value) => {
    return div(
      label,
      focus_button &&
        `${state._focus_row_id}` !== `${value}` &&
        a(
          {
            class: "gantt-row-btn",
            title: "Focus",
            href: `javascript:set_state_field('_focus_row_id', ${
              typeof value === "string" ? `'${value}'` : value
            });`,
          },
          i({ class: "ms-2 fas fa-compress-arrows-alt" })
        ),
      focus_button &&
        `${state._focus_row_id}` === `${value}` &&
        a(
          {
            title: "Focus",
            href: `javascript:unset_state_field('_focus_row_id');`,
          },
          i({ class: "ms-2 fas fa-expand-arrows-alt" })
        ),
      add_on_row &&
        a(
          {
            class: "gantt-row-btn",
            title: "Add task",
            href: `javascript:ajax_modal('/view/${edit_view}?${row_field}=${value}');`,
          },
          i({ class: "ms-2 fas fa-plus-square" })
        )
    );
  };

  const tasks = dbrows
    .filter((r) => r[start_field])
    .map((r) => {
      if (!chart_rows[row_id_lookup(r[row_field])]) {
        chart_rows[row_id_lookup(r[row_field])] = {
          id: row_id_lookup(r[row_field]),
          enableDragging: !!move_within_row && role <= table.min_role_write,
          //label,
          headerHtml: mkHeaderHtml(
            row_fld.is_fkey ? r[`summary_field_${row_fld.name}`] : r[row_field],
            r[row_field]
          ),
        };
        row_id_order.push(row_id_lookup(r[row_field]));
        if (use_tree_field && r[use_tree_field]) {
          const parent_row = dbrows.find(
            (dbr) =>
              dbr[row_fld.is_fkey ? row_field : "id"] === r[use_tree_field]
          );
          const parent_id = row_id_lookup(parent_row?.[row_field]);
          chart_rows[row_id_lookup(r[row_field])].parent_id = parent_id;
        }
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
        enableDragging: true,
        showButton: !!edit_view,
        from: r[start_field],
        to,
      };
      if (description_field) {
        task.html = `<div title="${r[description_field]}">${r[title_field]}</div>`;
      } else task.label = r[title_field];
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
      task.classes = `${task.classes || ""} gantt-text-col`;
      return task;
    });

  if (
    !hide_empty_rows &&
    (row_fld.is_fkey ||
      (row_fld.type.name === "String" &&
        row_fld.attributes &&
        row_fld.attributes.options))
  ) {
    const vals = await row_fld.distinct_values();
    if (vals[0]?.value === "") {
      vals.push(vals.shift());
    }
    vals.forEach(({ label, value }) => {
      if (!chart_rows[row_id_lookup(value)]) {
        chart_rows[row_id_lookup(value)] = {
          id: row_id_lookup(value),
          enableDragging: !!move_between_rows,
          headerHtml: mkHeaderHtml(label, value),
        };
        row_id_order.push(row_id_lookup(value));
      }
    });
  }
  let ordered_chart_rows = [];

  //console.log(chart_rows);
  //reorder chart rows according to tree
  row_id_order.forEach((k) => {
    const r = chart_rows[k];
    if (!r.parent_id) ordered_chart_rows.push(r);
    else {
      //find the path from chart_rows
      const path = [r.id];
      let iterrow = r;
      do {
        iterrow = chart_rows[iterrow.parent_id];

        if (!iterrow)
          throw new Error("Tree parent not found: " + iterrow.parent_id);
        if (path.includes(iterrow.id))
          throw new Error(
            "Tree parent cycle detected: " +
              iterrow.parent_id +
              " in " +
              JSON.stringify(path)
          );

        path.push(iterrow.id);
      } while (iterrow.parent_id);

      //traverse, inserting

      path.reverse();
      let parent; //= chart_rows[path[0]];
      path.forEach((pid) => {
        const theRow = chart_rows[pid];

        if (!parent) {
          parent = theRow;
          return;
        }
        //insert in parent
        const next_parent = (parent.children || []).find((p) => p.id === pid);
        if (next_parent) parent = next_parent;
        else {
          parent.children = [...(parent.children || []), theRow];
          parent = theRow;
        }

        //set next parent
      });
    }
  });
  let focused_chart_rows = ordered_chart_rows;
  let focused_tasks = tasks;
  if (focus_button && state._focus_row_id) {
    //console.log({ row_id_lookup_array });
    const traverse = (row) => {
      // do I match
      const myid = row_id_lookup_array
        ? row_id_lookup_array[row.id - 1]
        : row.id;

      if (`${myid}` === state._focus_row_id) return row; // with children
      else if (row.children) {
        const travRes = row.children.map(traverse).filter((r) => r);
        if (travRes.length == 0) return false;
        else if (travRes.length == 1) return travRes[0];
        else throw new Error("multiple travres: " + JSON.stringify(travRes));
      }
    };
    focused_chart_rows = ordered_chart_rows.map(traverse).filter((r) => r);
    const included_rows = new Set();
    const collect = (row) => {
      included_rows.add(row.id);
      (row.children || []).forEach(collect);
    };
    focused_chart_rows.forEach(collect);
    focused_tasks = tasks.filter((t) => included_rows.has(t.resourceId));
  }

  if (state[`_fromdate_${start_field}`])
    first_start = new Date(state[`_fromdate_${start_field}`]);
  if (state[`_todate_${start_field}`])
    last_end = new Date(state[`_todate_${start_field}`]);
  var spanDays = moment(last_end).diff(first_start, "days");
  var spanMonths = moment(last_end).diff(first_start, "months");
  const spanProps =
    spanMonths > 36
      ? {
          columnOffset: 14,
          columnUnit: "day",
          magnetUnit: "day",
          magnetOffset: 1,
          headers: [
            {
              unit: "year",
              format: "YYYY",
              offset: 1,
            },
            { unit: "month", format: "[Q]Q", offset: 3 },
          ],
        }
      : spanMonths > 12
      ? {
          columnOffset: 14,
          columnUnit: "day",
          magnetUnit: "day",
          magnetOffset: 1,
          headers: [
            {
              unit: "month",
              format: "YYYY[Q]Q",
              offset: 3,
            },
            { unit: "month", format: "MM", offset: 1 },
          ],
        }
      : spanDays > 120
      ? {
          columnOffset: 14,
          columnUnit: "day",
          magnetUnit: "day",
          magnetOffset: 1,
          headers: [
            {
              unit: "month",
              format: "MMM YY",
              offset: 1,
            },
            { unit: "day", format: "[W]w", offset: spanDays > 200 ? 14 : 7 },
          ],
        }
      : spanDays > 30
      ? {
          columnOffset: 14,
          columnUnit: "day",
          magnetUnit: "day",
          magnetOffset: 1,
          headers: [
            { unit: "day", format: "MM/YY [W]w", offset: 7 },
            { unit: "day", format: "DD", offset: Math.ceil(spanDays / 50) },
          ],
        }
      : spanDays > 10
      ? {
          columnOffset: 1,
          columnUnit: "day",
          magnetUnit: "day",
          magnetOffset: 1,
          headers: [
            { unit: "day", format: "MMM YYYY [Week ]w", offset: 7 },

            { unit: "day", format: "ddd DD", offset: 1 },
          ],
        }
      : spanDays > 4
      ? {
          columnOffset: 3,
          columnUnit: "hour",
          magnetUnit: "hour",
          magnetOffset: 1,
          headers: [
            { unit: "day", format: "ddd DD MMM YYYY", offset: 1 },
            { unit: "hour", format: "H:mm", offset: Math.ceil(spanDays) },
          ],
        }
      : spanDays > 1
      ? {
        columnOffset: 60,
        columnUnit: "minute",
        magnetUnit: "minute",
        magnetOffset: 30,
          headers: [
            { unit: "day", format: "dddd DD MMM YYYY", offset: 1 },
            { unit: "hour", format: "H:mm", offset: Math.ceil(spanDays) },
          ],
        }
      : {
          columnOffset: 30,
          columnUnit: "minute",
          magnetUnit: "minute",
          magnetOffset: 15,
          headers: [
            { unit: "day", format: "dddd DD MMM YYYY", offset: 1 },
            { unit: "hour", format: "H:mm", offset: Math.ceil(spanDays) },
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
  }
  //console.log({ first_start, last_end });
  //console.log(tasks);
  const divid = `gantt${Math.floor(Math.random() * 16777215).toString(16)}`;
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
    (focus_button && state._focus_row_id
      ? button(
          {
            class: "btn btn-sm btn-primary ms-2",
            onClick: "unset_state_field('_focus_row_id')",
          },
          "Lose focus"
        )
      : "") +
    div({ id: divid }) +
    style(
      [...colors]
        .map((c) => `.color-${c} {background-color: #${c}}`)
        .join("\n") +
        `.gantt-text-col { color: ${text_color || "#000000"}}
        .milestone { transform: rotate(45deg);
          transform-origin: center center;  }
        .milestone .sg-task-content {
           color:black;
         }
         .sg-table-body-cell .gantt-row-btn {
           display:none;
         }
         .sg-table-body-cell:hover .gantt-row-btn {
          display:inline;
         }`
    ) +
    script(
      domReady(`
      const tasks = ${JSON.stringify(
        focused_tasks,
        null,
        2
      )}.map(t=>{t.from = new Date(t.from); t.to = new Date(t.to); return t});
      //console.log(tasks)
      const row_id_lookup_array = ${JSON.stringify(row_id_lookup_array)};
      const gantt = new SvelteGantt({ 
    target: document.getElementById('${divid}'), 
    props: {
      tasks,
      rows:${JSON.stringify(focused_chart_rows)},
      from: new Date(${JSON.stringify(first_start)}),
      to: new Date(${JSON.stringify(last_end)}),  
      dateAdapter: new MomentSvelteGanttDateAdapter(moment),    
      rowHeight: 52,
      rowPadding: 6,
      fitWidth: true,
      reflectOnParentRows: ${!!reflectOnParentRows},
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
    gantt.api.tasks.on.changed((tasks) => {     
      const from = tasks[0].task.model.from
      const to = tasks[0].task.model.to
      const new_row = tasks[0].targetRow.model.id
      const model_id = tasks[0].task.model.id
      view_post('${viewname}', 'change_task', {from, to, new_row, model_id, row_id_lookup_array});
    })
    let lastSelected, prevSelected;
    gantt.api.tasks.on.select((tasks) => {
      prevSelected = lastSelected;
      lastSelected =  tasks[0]?.model?.id
      if(prevSelected && lastSelected) {
         $('.btn.add-dependency').prop('disabled', false);
      }
    });
    function milestone_diamonds() {
      $('.milestone').each(function() {
        const tr = $(this).css('transform')
        const h = $(this).height()        
        if(tr.includes('matrix(1, 0,'))
          $(this).css('transform',tr+' rotate(45deg)' ).css('transition-property','none');
        $(this).width(h);
        $(this).attr("title", $(this).find(".sg-task-content").text() )
        $(this).find(".sg-task-content").css({transform: 'rotate(-45deg) translate('+(h*1.25)+'px, '+(-h/2)+'px)'})
      })
    }
    setTimeout(milestone_diamonds)
    setInterval(milestone_diamonds,500)
    window.gantt_add_dependency= ()=>{
      view_post('${viewname}', 'add_dependency', {from: prevSelected, to: lastSelected},
      ()=>{location.reload();})
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
  { from, to, new_row, model_id, row_id_lookup_array },
  { req }
) => {
  //console.log(tasks[0]);
  const table = await Table.findOne({ id: table_id });

  const row_id_lookup = (id) =>
    row_id_lookup_array ? row_id_lookup_array[id - 1] : id;

  const role = req.isAuthenticated() ? req.user.role_id : 10;
  if (role > table.min_role_write) {
    return { json: { error: "not authorized" } };
  }
  const start = new Date(from);
  const end = new Date(to);
  const updRow = {
    [start_field]: start,
  };

  if (end_field) updRow[end_field] = end;
  if (duration_field)
    updRow[duration_field] = moment(end).diff(
      start,
      duration_units.toLowerCase()
    );

  if (move_between_rows) updRow[row_field] = row_id_lookup(new_row);
  await table.updateRow(updRow, model_id);
  return { json: { success: "ok" } };
};

module.exports = {
  headers: [
    {
      script: features?.version_plugin_serve_path
        ? "/plugins/public/svelte-gantt@0.2.4/index.iife.js"
        : "/plugins/public/svelte-gantt/index.iife.js",
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
