/* global $ */
/*eslint-env browser*/

//https://stackoverflow.com/a/9976309/19839414
function resizeIframe(obj) {
  obj.style.height =
    obj.contentWindow.document.documentElement.scrollHeight + "px";
}

function apply_gantt_iframe(divid) {
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

  $(`#if${divid}`).attr("srcdoc", els.join("") + chartContent);
  resizeIframe($(`#if${divid}`)[0]);
}
