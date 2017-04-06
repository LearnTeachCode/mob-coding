'use strict';
var fs = require('fs');
fs.createReadStream('.sample-env')
  .pipe(fs.createWriteStream('.env'));
console.log('\n\tCreated .env file in project\'s root directory.\n\tRemember to open that file and put your GitHub API secret in there!\n\t(Only for development environments.)\n');