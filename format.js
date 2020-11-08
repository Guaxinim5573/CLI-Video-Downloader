const ytdl = require("ytdl-core")
const fs = require("fs")
const ffmpeg = require("fluent-ffmpeg")
const ora = require("ora")

module.exports = function(title) {
	return new Promise((r, rj) => {
		try {
			const spin = ora("Converting...").start()
			const proc = new ffmpeg({source: title + ".mp4"})
			proc.withAudioCodec("libmp3lame")
			.toFormat("mp3")
			.output(title + ".mp3")
			.run()
			proc.on("progress", progress => {
				const bar = progress.percent ? progress.percent.toFixed(0) + "% - [" + ("█".repeat(progress.percent / 5)) + (" ".repeat(20 - progress.percent / 5)) + "]" : ""
				spin.text = "Converting...\n"  + bar
			}).once("end", () => {
				spin.text = "Deleting temp files..."
				fs.unlink(title + ".mp4", (e) => {
					if(e) {
						spin.fail(e.message)
						return rj(e)
					}
					spin.succeed("Formated!")
					r()
				})
			})
		} catch(e) {
			rj(e)
		}
	})
}