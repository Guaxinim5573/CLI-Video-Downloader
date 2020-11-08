#! /usr/bin/env node

const args = process.argv.splice(2, process.argv.length - 1)
if(args.includes("--version") || args.includes("-v")) {
	console.log("CLI-Video-Downloader v" + require("../package.json").version)
	process.exit()
}

const debug = args.includes("--debug")
if(debug) {
	console.log("Initializing in debug mode")
}
args.splice(args.indexOf("--debug"), 1)

const ytdl = require("ytdl-core")
const chalk = require("chalk")
const ora = require("ora")
const inquirer = require("inquirer")

function handleError(e) {
	console.log("\nUnexpected error:\n" + chalk.red(e.message || e))
	if(debug) {
		console.log(e.stack || "no stack")
	}
	process.exit(1)
}

async function ask() {
	return inquirer.prompt([
		{
			type: "list",
			name: "format",
			message: "Select format",
			choices: ["mp4", "mp3"]
		}, {
			type: "input",
			name: "url",
			message: "Input video url"
		}
	])
}

function er() {
	return new Promise((r, rj) => {
		setInterval(() => rj("Lololo"), 500)
	})
}

async function main() {
	try {
		const input = await ask()
		const spin = ora("Getting video info...").start()
		const info = await ytdl.getInfo(input.url).catch(e => {throw new Error(e)})
		spin.succeed("Found video!")
		if(debug) {
			console.log(chalk.yellow("Writing video info into videoDetails.json file"))
			require("fs").writeFile("./videoDetails.json", JSON.stringify(info), (e) => {
				if(e) console.log(chalk.yellow("[DEBUG error] Cannot write video details file:\n" + e.message))
			})
		}
		console.log("Title: "+ chalk.green(info.videoDetails.title))
		console.log("Channel name: " + chalk.green(info.videoDetails.ownerChannelName))
		const title = info ? info.videoDetails.title.replace(/\\|\/|\?|:|"|\*|<|>|\|/gm, "-") : "video-music"
		if(debug) console.log(chalk.yellow("[DEBUG] Formated title = " + title))
		await require("../download.js")(input.url, title).catch(e => {throw e;})
		if(input.format === "mp3") await require("../format.js")(title).catch(e => {throw e;})
		console.log(chalk.green("Success!"))
	} catch(e){
		handleError(e)
	}
}
main().then(() => process.exit(0))