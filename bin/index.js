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
	process.exit()
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

async function confirmPlaylist() {
	return (await inquirer.prompt([
		{
			type: "confirm",
			name: "confirm",
			message: "A playlist was found in your url. Want to download playlist videos?",
			default: true
		}
	])).confirm
}

async function askVideos(videos) {
	const input = await inquirer.prompt([
		{
			type: "checkbox",
			name: "videos",
			message: "Select what video to download.",
			choices: videos.map((v, idx) => idx + ") " + (v.title.length > 20 ? v.title.slice(0, 25) + " ... " + v.title.slice(-10) : v.title)),
			default: []
		}
	])
	return videos.filter((v, idx) => input.videos.find(i => i.slice(0, 1) == idx))
}

async function downloadPlaylist(url, formatExt) {
	try {
		const ytpl = require("ytpl")
		const download = require("../download.js")
		const format = require("../format.js")
		const playlist = await ytpl(url).catch(e => {throw new Error(e)})
		if(playlist.total_items < 1) return new Error("The playlist are empty.")
		console.log("Playlist videos size: " + chalk.green(playlist.total_items) + "\n")
		if(debug && args.includes("--details")) {
			console.log(chalk.yellow("Writing playlist details into playlistDetails.json file."))
			require("fs").writeFile("./playlistDetails.json", JSON.stringify(playlist), (e) => {
				if(e) console.log(chalk.yellow("[DEBUG ERROR] Cannot write playlist details file:\n" + e.message))
			})
		}
		const videos = await askVideos(playlist.items)
		console.log("\nSelected " + chalk.green(videos.length) + " videos.\n")
		for(const video of videos) {
			console.log("Downloading " + chalk.green(video.title))
			const title = video.title.replace(/\\|\/|\?|:|"|\*|<|>|\|/gm, "-")
			await download(video.id, title).catch(e => {throw e;})
			if(formatExt === "mp3") await format(title).catch(e => {throw e;})
		}
	} catch(e) {
		handleError(e)
	}
}

async function main() {
	try {
		const input = await ask()
		if(debug) console.log(chalk.yellow("[DEBUG] url = " + input.url))
		if(input.url.includes("list=")) {
			const confirm = await confirmPlaylist()
			if(confirm) return await downloadPlaylist(input.url, input.format)
		}
		const spin = ora("Getting video info...").start()
		const info = await ytdl.getInfo(input.url).catch(e => {throw new Error(e)})
		spin.succeed("Found video!")
		if(debug && args.includes("--details")) {
			console.log(chalk.yellow("Writing video info into videoDetails.json file."))
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
main().then(() => process.exit())