The visual job executes WebGPU via Chromium/SwiftShader on Linux. Committed
snapshots are also checked locally on hardware (Metal). GPU antialiasing may
produce a small number of backend-dependent pixels; the test allows 0.2% changed
pixels with a 0.1 color threshold, and independently asserts key hole/cutout pixels.
