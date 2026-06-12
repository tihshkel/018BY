import AppKit
import Foundation
import Vision

guard CommandLine.arguments.count > 1 else {
  fputs("Usage: ocr-page-png.swift <path-to-png>\n", stderr)
  exit(1)
}

let path = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: path),
      let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let cgImage = bitmap.cgImage
else {
  fputs("Failed to load image: \(path)\n", stderr)
  exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["ru-RU", "en-US"]
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try handler.perform([request])

struct OcrItem: Encodable {
  let str: String
  let normX: Double
  let normYTop: Double
  let right: Double
}

var items: [OcrItem] = []

for observation in request.results ?? [] {
  guard let candidate = observation.topCandidates(1).first else { continue }
  let text = candidate.string.trimmingCharacters(in: .whitespacesAndNewlines)
  if text.isEmpty { continue }

  let box = observation.boundingBox
  let normX = box.origin.x
  let normYTop = box.origin.y + box.size.height
  let right = normX + box.size.width

  items.append(OcrItem(str: text, normX: normX, normYTop: normYTop, right: right))
}

items.sort { lhs, rhs in
  if abs(lhs.normYTop - rhs.normYTop) > 0.01 {
    return lhs.normYTop > rhs.normYTop
  }
  return lhs.normX < rhs.normX
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]
let data = try encoder.encode(items)
FileHandle.standardOutput.write(data)
