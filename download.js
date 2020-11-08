const ytdl = require("ytdl-core")
const ora = require("ora")
const fs = require("fs")

module.exports = function(url, title) {
	return new Promise(async (r, rj) => {
		try {
			const spin = ora("Downloading...").start()
			const video = await ytdl(url, {quality: "highest"})
			const stream = video.pipe(fs.createWriteStream(title + ".mp4"))
			video.on("progress", (chunk, downloaded, total) => {
				const percent = downloaded / total * 100
				const bar = percent.toFixed(0) + "% - [" + ("█".repeat(percent / 5)) + (" ".repeat(20 - percent / 5)) + "]"
				spin.text = "Downloading...\n" + bar
			})
			stream.once("finish", () => {
				spin.succeed("Downloaded!")
				r()
			})
		} catch(e) {
			rj(e)
		}
	})
}