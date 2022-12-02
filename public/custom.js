/* global $ */
/*eslint-env browser*/

function apply_iframe(divid) {
  const chartContent = $(`#if${divid}`).attr("srcdocPre");
  const els = [];
  $("link[rel=stylesheet]").map((s, e) => {
    const $e = $(e);
    els.push(`<link href="${$e.attr("href")}" rel="stylesheet">`);
  });

  $("script[src]").map((s, e) => {
    const $e = $(e);
    els.push(`<script src="${$e.attr("src")}"></script>`);
  });
  console.log("els", els);

  $(`#if${divid}`).attr("srcdoc", els.join("") + chartContent);
}
