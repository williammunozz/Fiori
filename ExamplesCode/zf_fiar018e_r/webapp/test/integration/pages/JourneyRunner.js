sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"argos/zfiar018e/zffiar018er/test/integration/pages/reportList",
	"argos/zfiar018e/zffiar018er/test/integration/pages/reportObjectPage"
], function (JourneyRunner, reportList, reportObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('argos/zfiar018e/zffiar018er') + '/test/flp.html#app-preview',
        pages: {
			onThereportList: reportList,
			onThereportObjectPage: reportObjectPage
        },
        async: true
    });

    return runner;
});

