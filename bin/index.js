#! /usr/bin/env node

const args = process.argv.splice(2, process.argv.length - 1)

const fs = require("fs")
const ytdl = require("ytdl-core")
const ffmpeg = require("fluent-ffmpeg")
const chalk = require("chalk")
const ora = require("ora")
const inquirer = require("inquirer")

async function handleError(e) {
	console.log("\n" + chalk.red(e.message))
	process.exit()
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

const download = (url, title, format) => new Promise(async (r, rj) => {
	try {
		const options = {quality: 'highest'};
		const spin = ora("Downloading...").start()
		const video = await ytdl(url, options)
		const stream = video.pipe(fs.createWriteStream((format === "mp4" ? "" : "temp-") + title + ".mp4"))
		video.on("progress", (chunk, downloaded, total) => {
			const percent = downloaded / total
			spin.text = "Downloading... " + `${(percent * 100).toFixed()}% ${(downloaded / 1024 / 1024).toFixed(2)}MB/${(total / 1024 / 1024).toFixed(2)}MB`
		})
		stream.once("finish", () => {
			spin.succeed("Downloaded!")
			r()
		})
	} catch(e) {
		rj(e)
	}
})

const format = (title) => new Promise((r, rj) => {
	try {
		const spin = ora("Converting...").start()
		const proc = new ffmpeg({source: "temp-" + title + ".mp4"})
		//proc.setFfmpegPath("FFmpeg")
		proc.withAudioCodec("libmp3lame")
		.toFormat("mp3")
		.output(title + ".mp3")
		.run()
		proc
		.on("progress", progress => {
			spin.text = "Converting... " + (progress.percent ? progress.percent.toFixed() + "%" : "")
		})
		.once("end", () => {
			spin.succeed("Converted!")
			const spin2 = ora("Deleting temp file...")
			fs.unlink("temp-" + title + ".mp4", (err) => {
				if(err) return rj(e)
				spin2.succeed("Deleted temp file!")
				r()
			})
		})
	} catch(e) {
		rj(e)
	}
})

const getInfo = (url) => new Promise((r, rj) => {
	try {
		ytdl.getInfo(url, (err, info) => {
			if(err) return rj(err)
			r(info)
		})
	} catch(e) {
		rj(e)
	}
})

async function main() {
	try {
		const input = await ask()
		const start = Date.now()
		const url = input.url
		const spin = ora("Getting video info...").start()
		const info = await getInfo(url).catch(e => {throw new Error(e.message)})
		spin.succeed("Video found!")
		const title = info ? info.title.replace(/\\|\/|\?|:|"|\*|<|>|\|/gm, "-") : "video-music"
		console.log("Title: " + chalk.green(title))
		console.log("Channel name: " + chalk.green(info.author.name))
		await download(url, title, input.format)
		if(input.format === "mp3") await format(title)
		console.log(chalk.green(title) + " dowloaded in " + chalk.yellow(`${(Date.now() - start) / 1000}`) + " seconds")
	} catch(e) {
		handleError(e)
	}
}

main()