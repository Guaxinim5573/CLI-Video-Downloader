#! /usr/bin/env node

const args = process.argv.splice(2, process.argv.length - 1)

const fs = require("fs")
const ytdl = require("ytdl-core")
const ffmpeg = require("fluent-ffmpeg")
const chalk = require("chalk")
const ora = require("ora")
const inquirer = require("inquirer")

async function handleError(e) {
	console.log(chalk.red(e.message))
}

async function ask() {
	var q = [
		{
			type: 'list',
			name: 'format',
			message: 'Select the format',
			choices: ['mp4', 'mp3']
		},
		{
			type: 'input',
			name: 'url',
			message: 'Input the video URL'
		}
	]
	return inquirer.prompt(q)
}

const download = async (url, title, format) => new Promise(async function(resolve, reject){
	try {
		let options;
		if(format === "mp4") options = {quality: "highest"}
		else options = {}
		var spin1 = ora("Downloading...").start()
		var stream = await ytdl(url, options).pipe(fs.createWriteStream(title + ".mp4"))
		stream.on("finish", async function() {
			spin1.succeed("Downloaded!")
			resolve()
		})
	} catch(e) {
		reject(e)
	}
})

const format = async (title, start) => new Promise(async function(resolve, reject){
	try {
		var spin2 = ora("Converting...").start()
		var proc = new ffmpeg({source: title + ".mp4"})
		proc.setFfmpegPath("FFmpeg")
		proc.withAudioCodec("libmp3lame")
		.toFormat("mp3")
		.output(title + ".mp3")
		.run()
		proc.on("end", function() {
			spin2.succeed("Converted!")
			var spin3 = ora("Deleting temp files...")
			try {
				fs.unlink(title + ".mp4", function(err){
					if(err) return new Error(err)
				})
			} catch(e) {
				reject(e)
			} finally{
				spin3.succeed("Deleted temp files!")
				console.log(chalk.green(title) + " downloaded and converted in " + chalk.yellow(`${(Date.now() - start) / 1000}`) + " seconds")
				resolve()
			}
		})
	} catch(e) {
		reject(e)
	}
})

const getInfo = async (url) => new Promise(async function(resolve, reject){
	try {
		var title = ""
		ytdl.getInfo(url, async function(err, info){
			if(err) reject(err)
			if(!info || info == undefined) title = "video-music"
			else title = await info.title
			resolve(title)
		})
	} catch(e) {
		reject(e)
	}
})

async function main() {
	try {
		var input = await ask()
		const start = Date.now()
		var url = input.url
		var title = await getInfo(url)
		await download(url, title)
		if(input.format === "mp3"){
			await format(title, start)
		} else {
			console.log(chalk.green(title) + " dowloaded in " + chalk.yellow(`${(Date.now() - start) / 1000}`) + " seconds")
		}
	} catch(e) {
		handleError(e)
	}
}

main()