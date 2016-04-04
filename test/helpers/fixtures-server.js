var fs = require("fs")
var http = require("http")
var path = require("path")
var assign = require("object-assign")

module.exports = function(options) {
  options = assign({
    port: 3333,
    root: ".",
  }, options)

  this.server = http.createServer(function(req, res) {
    if (req.url === "500") {
      res.writeHead(500)
      res.end("Internal server error")
      return
    }
    else if (req.url === "404") {
      res.writeHead(404)
      res.end("Not found")
      return
    }

    const fp = path.join(options.root, req.url)
    const ct = path.extname(fp) == ".css" ? "text/css" : "text/plain"

    fs.readFile(fp, function(err, data) {
      if (err) {
        if (err.code === "ENOENT") {
          res.writeHead(404)
          res.end("Not found")
        }
        else {
          res.writeHead(500)
          res.end("Internal server error")
        }
      }

      else {
        res.writeHead(200, {
          "Content-Type": ct,
        })
        res.end(data, "utf-8")
      }
    })
  })

  this.listen = function() {
    return new Promise(function(resolve) {
      this.server.listen(options.port, function() {
        resolve()
      })
    }.bind(this))
  }

  this.close = function() {
    return new Promise(function(resolve) {
      this.server.close(function() {
        resolve()
      })
    }.bind(this))
  }
}
