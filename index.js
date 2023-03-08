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
  iframe,
  html,
  head,
  body,
  label,
} = require("@saltcorn/markup/tags");
const {
  readState,
  stateFieldsToWhere,
  add_free_variables_to_joinfields,
} = require("@saltcorn/data//plugin-helper");
const { features } = require("@saltcorn/data/db/state");

const moment = require("moment"); // require
const { calcSpanProps } = require("./common");

//https://stackoverflow.com/a/13532993 - not used
function shadeColor(color, percent) {
  var R = parseInt(color.substring(1, 3), 16);
  var G = parseInt(color.substring(3, 5), 16);
  var B = parseInt(color.substring(5, 7), 16);

  R = parseInt((R * (100 + percent)) / 100);
  G = parseInt((G * (100 + percent)) / 100);
  B = parseInt((B * (100 + percent)) / 100);

  R = R < 255 ? R : 255;
  G = G < 255 ? G : 255;
  B = B < 255 ? B : 255;

  var RR = R.toString(16).length == 1 ? "0" + R.toString(16) : R.toString(16);
  var GG = G.toString(16).length == 1 ? "0" + G.toString(16) : G.toString(16);
  var BB = B.toString(16).length == 1 ? "0" + B.toString(16) : B.toString(16);

  return "#" + RR + GG + BB;
}

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
          const duration_field_options = fields
            .filter((f) => f.type.name === "Integer" || f.type.name === "Float")
            .map((f) => f.name);
          return new Form({
            fields: [
              {
                name: "title_field",
                label: "Title field",
                type: "String",
                sublabel: "Event label displayed on the task.",
                required: true,
                attributes: {
                  options: [
                    ...fields
                      .filter((f) => f.type.name === "String")
                      .map((f) => f.name),
                    "Formula",
                  ],
                },
              },
              {
                name: "title_formula",
                label: "Title formula",
                class: "validate-expression",
                type: "String",
                showIf: { title_field: "Formula" },
              },
              {
                name: "description_field",
                label: "Description field",
                type: "String",
                sublabel: "Shown when the mouse hovers over the task",
                attributes: {
                  options: [
                    ...fields
                      .filter((f) => f.type.name === "String")
                      .map((f) => f.name),
                    "Formula",
                  ],
                },
              },
              {
                name: "description_formula",
                label: "Description formula",
                class: "validate-expression",
                type: "String",
                showIf: { description_field: "Formula" },
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
                name: "row_label_formula",
                label: "Row label formula",
                class: "validate-expression",
                type: "String",
                sublabel: "Leave blank to use row field",
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
                  options: duration_field_options,
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
                showIf: { duration_field: duration_field_options },
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
                name: "completed_field",
                label: "Completed field",
                type: "String",
                sublabel: "Color will be grey for completed tasks",
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
                name: "task_detail_view",
                label: "Task detail view",
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
              {
                name: "add_task_top",
                label: "Add button on top",
                type: "Bool",
              },
              {
                name: "show_current_time",
                label: "Show current time",
                sublabel: "As a shaded range",
                type: "Bool",
              },
              {
                name: "lock_editing_switch",
                label: "Lock editing switch",
                type: "Bool",
              },
              {
                name: "in_iframe",
                label: "iframe",
                sublabel:
                  "Display the Gantt chart inside an iframe. Necessary for more than one chart on a page",
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
          let add_row_view_opts = [];
          if (row_field?.is_fkey) {
            const reftable = Table.findOne({
              name: row_field.reftable_name,
            });
            const reffields = await reftable.getFields();
            reffields.forEach((f) =>
              order_options.push(`${row_field.name}.${f.name}`)
            );
            add_row_view_opts = await View.find_table_views_where(
              reftable,
              () => true
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
            tree_field_options.push(...fields.map((f) => `Group by ${f.name}`));
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
              {
                name: "resource_field",
                label: "Resource field",
                type: "String",
                sublabel: "Field indicating the resource to track",
                attributes: {
                  options: fields.filter((f) => f.is_fkey).map((f) => f.name),
                },
              },
              ...(row_field?.is_fkey
                ? [
                    {
                      name: "add_row_view",
                      label: "Add row view",
                      type: "String",
                      attributes: {
                        options: add_row_view_opts.map((v) => v.name),
                      },
                    },
                  ]
                : []),
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
    row_label_formula,
    end_field,
    color_field,
    title_formula,
    description_formula,
    milestone_field,
    move_between_rows,
    move_within_row,
    edit_view,
    task_detail_view,
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
    show_current_time,
    lock_editing_switch,
    add_row_view,
    add_task_top,
    completed_field,
    resource_field,
    in_iframe,
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

  console.log(state);
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
  const link_create_qs = Object.keys(state)
    .filter((k) => fields.find((f) => f.name === k))
    .map((k) => `&${encodeURIComponent(k)}=${encodeURIComponent(state[k])}`)
    .join("");

  const joinFields = {};
  if (row_fld.is_fkey) {
    joinFields[`summary_field_${row_fld.name}`] = {
      ref: row_fld.name,
      target: row_fld.attributes.summary_field,
    };
  }
  if (resource_field) {
    joinFields[`summary_resource_field`] = {
      ref: resource_field,
      target: fields.find((r) => r.name === resource_field).attributes
        .summary_field,
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
  let tree_is_groupby = false;
  let tree_value_field;
  if (tree_field.startsWith("Group by")) {
    tree_is_groupby = true;
    use_tree_field = tree_field.replace("Group by ", "");
    const the_tree_field = fields.find((f) => f.name === use_tree_field);
    if (the_tree_field && the_tree_field.is_fkey) {
      joinFields[`_tree`] = {
        ref: use_tree_field,
        target: the_tree_field.attributes.summary_field,
      };
      tree_value_field = use_tree_field;
      use_tree_field = "_tree";
    }
  } else if (tree_field && row_fld.is_fkey) {
    joinFields[`_tree`] = {
      ref: row_field,
      target: tree_field,
    };
    use_tree_field = "_tree";
  }
  if (row_label_formula && add_free_variables_to_joinfields)
    add_free_variables_to_joinfields(
      freeVariables(row_label_formula),
      joinFields,
      fields
    );
  //console.log({ tree_field, use_tree_field });
  const dbrows = await table.getJoinedRows({
    where: qstate,
    joinFields,
    orderBy: (row_order_field || "").includes(".") ? "_order" : row_order_field,
    orderDesc: row_order_descending,
  });
  const chart_rows = {};

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
              typeof value === "string"
                ? `'${encodeURIComponent(value)}'`
                : value
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
            href: `javascript:ajax_modal('/view/${edit_view}?${row_field}=${encodeURIComponent(
              value
            )}${link_create_qs}');`,
          },
          i({ class: "ms-2 fas fa-plus-square" })
        )
    );
  };

  const tasks = dbrows
    .filter((r) => r[start_field])
    .map((r) => {
      const row_id = tree_is_groupby
        ? `${r[tree_value_field || use_tree_field]}_${r[row_field]}`
        : r[row_field];

      if (!chart_rows[row_id]) {
        chart_rows[row_id] = {
          id: row_id,
          enableDragging: !!move_within_row && role <= table.min_role_write,
          //label,
          headerHtml: mkHeaderHtml(
            row_label_formula
              ? eval_expression(row_label_formula, r)
              : row_fld.is_fkey
              ? r[`summary_field_${row_fld.name}`]
              : r[row_field],
            row_id
          ),
        };
        row_id_order.push(row_id);

        if (use_tree_field && r[use_tree_field]) {
          if (tree_is_groupby) {
            const parent_id = `group${r[tree_value_field || use_tree_field]}`;
            if (!chart_rows[parent_id]) {
              chart_rows[parent_id] = {
                id: parent_id,
                enableDragging: false,
                label: `${r[use_tree_field]}`,
                //headerHtml: mkHeaderHtml(r[use_tree_field], r[use_tree_field]),
              };
              row_id_order.push(parent_id);
            }
            chart_rows[row_id].parent_id = parent_id;
          } else {
            const parent_row = dbrows.find(
              (dbr) =>
                dbr[row_fld.is_fkey ? row_field : "id"] === r[use_tree_field]
            );
            const parent_id = parent_row?.[row_field];
            chart_rows[row_id].parent_id = parent_id;
          }
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
      r._to = to;
      const task = {
        id: r.id,
        resourceId: row_id,
        enableDragging: true,
        showButton: !!task_detail_view,
        from: r[start_field],
        to,
      };
      const title =
        title_field === "Formula"
          ? eval_expression(title_formula, r)
          : r[title_field];
      const description =
        description_field === "Formula"
          ? eval_expression(description_formula, r)
          : description_field
          ? r[description_field]
          : null;
      if (description) {
        task.html = `<div title="${description || ""}">${title}</div>`;
      } else task.label = title;
      if (task_detail_view)
        task.buttonHtml = '<i class="ms-2 p-1 fas fa-edit"></i>';
      if (color_field && (r[color_field] || color_field.includes("."))) {
        let color = r[
          color_field.includes(".") ? "_color" : color_field
        ].substr(1, 6);
        if (completed_field && r[completed_field]) color = "AAA"; //shadeColor(color, 80);
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

  let distinct_group_vals;
  if (tree_is_groupby) {
    distinct_group_vals = {};
    dbrows.forEach((r) => {
      distinct_group_vals[r[tree_value_field || use_tree_field]] =
        r[use_tree_field];
    });
  }
  if (
    !hide_empty_rows &&
    (row_fld.is_fkey ||
      (row_fld.type.name === "String" &&
        row_fld.attributes &&
        row_fld.attributes.options) ||
      tree_is_groupby)
  ) {
    const vals = await row_fld.distinct_values();
    if (vals[0]?.value === "") {
      vals.push(vals.shift());
    }
    vals.forEach(({ label, value }) => {
      if (tree_is_groupby) {
        Object.entries(distinct_group_vals).forEach(([treev, treelbl]) => {
          const row_id = `${treev}_${value}`;
          if (!chart_rows[row_id]) {
            chart_rows[row_id] = {
              id: row_id,
              enableDragging: !!move_between_rows,
              headerHtml: mkHeaderHtml(label, row_id),
              parent_id: `group${treev}`,
            };
            row_id_order.push(row_id);
          }
        });
      } else if (!chart_rows[value]) {
        chart_rows[value] = {
          id: value,
          enableDragging: !!move_between_rows,
          headerHtml: mkHeaderHtml(label, value),
        };
        row_id_order.push(value);
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
      const myid = row.id;

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
  //console.log({ spanDays, spanMonths });
  const spanProps = calcSpanProps(spanMonths, spanDays);

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
  if (spanProps.alignStartTo) {
    first_start = moment(first_start).startOf(spanProps.alignStartTo).toDate();
    delete spanProps.alignStartTo;
  }
  const divid = `gantt${Math.floor(Math.random() * 16777215).toString(16)}`;

  let resource_preample = "";
  if (resource_field) {
    const columnUnit =
      spanProps.headers?.length > 1
        ? spanProps.headers[1].unit
        : spanProps.columnUnit;
    //console.log({ spanProps, columnUnit, headers: spanProps.headers });
    const ndivisions = moment(last_end).diff(moment(first_start), columnUnit);
    const resourceMap = {};
    dbrows
      .filter((r) => r[start_field])
      .forEach((r) => {
        const id = r[resource_field];
        if (!resourceMap[id])
          resourceMap[id] = {
            id: `res_${id}`,
            originalId: id,
            label: r.summary_resource_field,
            enableDragging: false,
          };
      });
    focused_chart_rows.push({
      id: "restracklabel",
      label: "Resources:",
      classes: "resseprow",
    });

    const resources = Object.values(resourceMap);
    let resTasks = [];
    let resTaskIdCounter = 1;

    resources.forEach((res) => {
      const divisions = Array(ndivisions).fill(0);
      dbrows
        .filter((r) => r[start_field] && r[resource_field] === res.originalId)
        .forEach((r) => {
          const startIx = Math.floor(
            moment(r[start_field]).diff(moment(first_start), columnUnit)
          );
          const endIx = Math.ceil(
            moment(r._to).diff(moment(first_start), columnUnit, true)
          );
          for (let i = startIx; i < endIx; i++) divisions[i]++;
        });
      for (let i = 0; i < ndivisions; i++)
        if (divisions[i] > 0)
          resTasks.push({
            resourceId: res.id,
            id: `restask${resTaskIdCounter++}`,
            label: divisions[i],
            from: moment(first_start).add(i, columnUnit),
            to: moment(first_start).add(i + 1, columnUnit),
            classes: `nresources-${divisions[i]}`,
            enableDragging: false,
          });
      focused_chart_rows.push(res);
    });
    let maxTaskCount = 0;
    resTasks.forEach((r) => {
      if (r.label > maxTaskCount) maxTaskCount = r.label;
      focused_tasks.push(r);
    });
    // make the low n's look a bit darker by adding 1
    const taskCountToOpacity = (n) => (1 + n) / (1 + maxTaskCount);
    resource_preample =
      style(
        [...Array(maxTaskCount).keys()]
          .map(
            (n) => `
      .nresources-${n + 1} {
        background-color: rgba(255, 80, 0, ${taskCountToOpacity(n + 1)});
      }`
          )
          .join("") +
          `
      .resseprow{
        background-image: linear-gradient(45deg, rgba(0, 0, 0, 0) 46%, #999 49%, #999 51%, rgba(0, 0, 0, 0) 55%);
        background-size: 6px 6px !important;
        );
      }     
      `
      ) +
      div(
        { class: `d-inline` },
        [...Array(maxTaskCount).keys()].map((n) =>
          div(
            {
              class: `nresources-${n + 1}`,
              style: {
                height: "30px",
                width: "30px",
                lineHeight: "30px",
                display: "inline-block",
                border: "1px solid grey",
                textAlign: "center",
                verticalAlign: "middle",
              },
            },
            n + 1
          )
        )
      );
  }

  let mainHtml =
    resource_preample +
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
    (add_row_view
      ? button(
          {
            class: "btn btn-sm btn-primary ms-2",
            onClick: `ajax_modal('/view/${add_row_view}')`,
          },
          "Add row"
        )
      : "") +
    (add_task_top
      ? button(
          {
            class: "btn btn-sm btn-primary ms-2",
            onClick: `ajax_modal('/view/${edit_view}?${link_create_qs}')`,
          },
          "Add task"
        )
      : "") +
    (lock_editing_switch
      ? div(
          { class: "form-check form-switch d-inline-block ms-2" },
          input({
            class: "form-check-input",
            type: "checkbox",
            role: "switch",
            id: "flexSwitchCheckChecked",
            onChange: "editingSwitch(this)",
          }),
          label(
            { class: "form-check-label", for: "flexSwitchCheckChecked" },
            "Edit"
          )
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
         }
         .sg-timeline {
           overflow-x: clip !important;
         }
         .sg-header {
          position: sticky !important;
          top: 0;
          background-color: white;
          z-index: 100;
        }`
    ) +
    script(
      domReady(`
      const tasks = ${JSON.stringify(
        focused_tasks
      )}.map(t=>{t.from = new Date(t.from); t.to = new Date(t.to); return t});
      //console.log(tasks)
      
      const ganttRows= ${JSON.stringify(focused_chart_rows)};

      const gantt = new SvelteGantt({ 
    target: document.getElementById('${divid}'), 
    props: {
      tasks,
      rows:ganttRows,
      from: new Date(${JSON.stringify(first_start)}),
      to: new Date(${JSON.stringify(last_end)}),  
      dateAdapter: new MomentSvelteGanttDateAdapter(moment),    
      rowHeight: 52,
      rowPadding: 6,
      fitWidth: true,
      ${
        show_current_time
          ? spanDays < 2.5
            ? `timeRanges: [{
        id: 0,
        from: moment().startOf('hour'),
        to: moment().endOf('hour'),
        classes: null,
        label: 'Now'
    }],`
            : spanDays < 40
            ? `timeRanges: [{
          id: 0,
          from: moment().startOf('day'),
          to:moment().endOf('day'),
          classes: null,
          label: 'Today'
      }],`
            : `timeRanges: [{
        id: 0,
        from: moment().startOf('week'),
        to:moment().endOf('week'),
        classes: null,
        label: 'W'+moment().format('WW')
    }],`
          : ""
      }
      reflectOnParentRows: ${!!reflectOnParentRows},
      ${
        task_detail_view
          ? `onTaskButtonClick: (task) => { ajax_modal('/view/${task_detail_view}?id='+task.id) },`
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
      view_post('${viewname}', 'change_task', {from, to, new_row, model_id});
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
        $(this).find(".sg-task-content").css({transform: 'rotate(-45deg) translate('+(h*1)+'px, '+(+h/3)+'px)'}).css('transform-origin','left')
      })
    }
    setTimeout(milestone_diamonds)
    setInterval(milestone_diamonds,500)
    window.gantt_add_dependency= ()=>{
      view_post('${viewname}', 'add_dependency', {from: prevSelected, to: lastSelected},
      ()=>{location.reload();})
    }
    window.editingSwitch=(e)=>{
      if(e.checked)
        gantt.$set({rows: ganttRows});
      else
        gantt.$set({rows: ganttRows.map(r=>({...r, enableDragging: false})) });
    }
    ${lock_editing_switch ? `window.editingSwitch({});` : ""}
    `)
    );
  const encode = (s) =>
    s.replace(
      //https://stackoverflow.com/a/57448862/19839414
      /[&<>'"]/g,
      (tag) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        }[tag])
    );
  if (in_iframe)
    return (
      iframe({
        width: "100%",
        height: "100%",
        id: `if${divid}`,
        srcdocPre: encode(mainHtml),
        onload: "setTimeout(()=>resizeIframe(this))",
      }) + script(domReady(`apply_gantt_iframe('${divid}');`))
    );
  else return mainHtml;
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
    tree_field,
  },
  { from, to, new_row, model_id },
  { req }
) => {
  //console.log(tasks[0]);
  const table = await Table.findOne({ id: table_id });

  const row_id_lookup = (id) => id;

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
  if (
    move_between_rows &&
    tree_field &&
    tree_field.startsWith("Group by") &&
    new_row
  ) {
    const [tree_value, row_value] = new_row.split("_");
    updRow[tree_field.replace("Group by ", "")] = tree_value;
    updRow[row_field] = row_value;
  } else if (move_between_rows) updRow[row_field] = new_row;
  await table.updateRow(updRow, model_id);
  return { json: { success: "ok" } };
};

module.exports = {
  headers: [
    {
      script: features?.version_plugin_serve_path
        ? `/plugins/public/svelte-gantt@${
            require("./package.json").version
          }/index.iife.js`
        : "/plugins/public/svelte-gantt/index.iife.js",
    },
    {
      script: `/plugins/public/svelte-gantt@${
        require("./package.json").version
      }/custom.js`,
    },
    {
      script: "/plugins/public/svelte-gantt/moment.min.js",
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
    //require("./resources")
  ],
};

//crash on drag
//dependencies
//tree - task str opts, task fkey, task self-join,
