if ($args -contains '--proxy') {
  $env:NODE_ENV = "proxy"
} else {
  $src = "$PSScriptRoot\public"
  $dest = "Z:\$(Split-Path -Path $PSScriptRoot -Leaf)"
  $env:NODE_ENV = "development"
  (Measure-Command {
    robocopy $src $dest /mir /ns /nc /nfl /ndl /np /njh /njs | Out-Null
  }).toString()
}

(Measure-Command { node $PSScriptRoot\scripts\build.js | Out-Default }).toString()
