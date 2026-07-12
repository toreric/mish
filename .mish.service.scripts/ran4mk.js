#!/usr/bin/node
if (process.argv.length === 3) {
  let n0 = process.argv[2]
  if (n0[0] === ".") return
  n0 = n0.replace(/[ ]+/g, "")
  let n1 = n0.replace(/\.[^.]*$/, "")
  n1 = n1.replace(/[^-._a-zA-Z0-9]+/g, "")
  let n2 = n0.replace(/(.+)(\.[^.]*$)/, "$2")
  if (n2[0] !== ".") {n2 = ""}
  let r4 = Math.random().toString(36).substr(2,4)
  console.log (n1 + r4 + n2)
} else {
  console.log ("Usage: " + process.argv[1] + " 'file basename'")
  console.log ("  Removes all spaces and non-ascii characters from a text string,")
  console.log ("  representing a file basename, leaving its (single) extension untouched,")
  console.log ("  but extending the name with four random characters drawn from a-z and 0-9")
  console.log ("  Note: A file name with leading dot is ignored")
  console.log ("  Needs: node (aka nodejs)")
  console.log ("  Output: The new (hopefully) unique file basename")
}
