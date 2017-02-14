'use strict';

function MainDirective() {
    return {
        templateUrl: '/templates/main.html',
        replace: true,
        controller: 'mainCtrl'
    };
}

module.exports = MainDirective;
