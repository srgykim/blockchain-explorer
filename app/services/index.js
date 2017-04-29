'use strict';

var angular = require('angular');

angular.module('blockchainWalletApp').service('validationService', require('./validation'));
angular.module('blockchainWalletApp').service('signupService', require('./signup'));
angular.module('blockchainWalletApp').service('signinService', require('./signin'));
angular.module('blockchainWalletApp').service('mainService', require('./main'));
angular.module('blockchainWalletApp').service('blockService', require('./block'));
angular.module('blockchainWalletApp').service('accountService', require('./account'));
