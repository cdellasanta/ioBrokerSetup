var myMdwTheme = {};
myMdwTheme.sentry = {};
myMdwTheme.sentry.getId = function () { if(existsState("vis-materialdesign.0.sentry")) { return "vis-materialdesign.0.sentry"; } else { console.warn("object 'vis-materialdesign.0.sentry' not exist!"); return '';} };
myMdwTheme.sentry.getValue = function () { if(existsState("vis-materialdesign.0.sentry")) { return getState("vis-materialdesign.0.sentry").val; } else { console.warn("object 'vis-materialdesign.0.sentry' not exist!"); return '';} };

