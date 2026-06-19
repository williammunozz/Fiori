sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'argos.zfiar018e.zffiar018er',
            componentId: 'reportList',
            contextPath: '/report'
        },
        CustomPageDefinitions
    );
});