'use strict';

var fs = require('fs');

// Try to create .env file but don't overwrite if it already exists
fs.open('.env', "wx", (err, fd) => {
	if (err) {
		// For any error other than "file already exists", throw it!
		if (err.code !== "EEXIST") {
			throw err;
		}
		// Stop the function here if there were ANY errors
		return;
	}

	// If creating/opening the .env file worked, write to it from .sample-env
	fs.createReadStream('.sample-env').pipe(fs.createWriteStream("", {fd: fd}));

	console.log('\n\tCreated .env file in project\'s root directory.\n\tRemember to open that file and put your GitHub API secret in there!\n\t(Only for development environments.)\n');
});
