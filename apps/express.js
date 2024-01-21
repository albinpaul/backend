const express = require('express');
const app = express();
const { createServer } = require('node:http');
const server = createServer(app);
module.exports = {app, server}