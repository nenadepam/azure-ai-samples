const fs = require("fs");
const createClient = require("@azure-rest/ai-vision-image-analysis").default;
const { AzureKeyCredential } = require("@azure/core-auth");
const path = require("path");
const sharp = require("sharp");
const dotenv = require("dotenv");

// Load the .env file if it exists
dotenv.config();

const endpoint = process.env["VISION_ENDPOINT"];
const key = process.env["VISION_KEY"];
const credential = new AzureKeyCredential(key);

const client = createClient(endpoint, credential);

const feature = [
  "Caption",
  "DenseCaptions",
  "Objects",
  "People",
  "Read",
  "SmartCrops",
  "Tags",
];
const imagePath = path.join(__dirname, "images", "sample.jpg");

async function analyzeImageFromFile() {
  const imageBuffer = fs.readFileSync(imagePath);

  const result = await client.path("/imageanalysis:analyze").post({
    body: imageBuffer,
    queryParameters: {
      features: feature,
      "smartCrops-aspect-ratios": [0.9, 1.33],
    },
    contentType: "application/octet-stream",
  });

  const iaResult = result.body;

  // Log the response using more of the API's object model
  console.log(`Model Version: ${iaResult.modelVersion}`);
  console.log(`Image Metadata: ${JSON.stringify(iaResult.metadata)}`);

  // Caption
  if (iaResult.captionResult) {
    console.log(
      `Caption: ${iaResult.captionResult.text} (confidence: ${iaResult.captionResult.confidence})`,
    );
  }

  // Dense Caption
  if (iaResult.denseCaptionsResult) {
    iaResult.denseCaptionsResult.values.forEach((denseCaption, index) => {
      console.log(`Dense Caption: ${JSON.stringify(denseCaption)}`);
      drawBoundingBox(
        imagePath,
        path.join(__dirname, "images", "DenseCaption" + index + ".jpg"),
        denseCaption.boundingBox,
      );
    });
  }

  // Object
  if (iaResult.objectsResult) {
    iaResult.objectsResult.values.forEach((object, index) => {
      console.log(`Object: ${JSON.stringify(object)}`);
      drawBoundingBox(
        imagePath,
        path.join(__dirname, "images", "Object" + index + ".jpg"),
        object.boundingBox,
      );
    });
  }

  // People
  if (iaResult.peopleResult) {
    iaResult.peopleResult.values.forEach((person, index) => {
      console.log(`Person: ${JSON.stringify(person)}`);
      drawBoundingBox(
        imagePath,
        path.join(__dirname, "images", "Person" + index + ".jpg"),
        person.boundingBox,
      );
    });
  }

  // Read
  if (iaResult.readResult) {
    iaResult.readResult.blocks.forEach((block) => {
      block.lines.forEach((line) => {
        drawBoundingBox(
          imagePath,
          path.join(__dirname, "images", line.text + ".jpg"),
          {
            x: line.boundingPolygon[0].x,
            y: line.boundingPolygon[0].y,
            w: line.boundingPolygon[1].x - line.boundingPolygon[0].x,
            h: line.boundingPolygon[3].y - line.boundingPolygon[0].y,
          },
        );
      });
    });
  }

  // SmartCrops
  if (iaResult.smartCropsResult) {
    iaResult.smartCropsResult.values.forEach((smartCrop, index) => {
      console.log(`Smart Crop: ${JSON.stringify(smartCrop)}`);
      drawBoundingBox(
        imagePath,
        path.join(__dirname, "images", "SmartCrop" + index + ".jpg"),
        smartCrop.boundingBox,
      );
    });
  }

  // Tags
  if (iaResult.tagsResult) {
    iaResult.tagsResult.values.forEach((tag) =>
      console.log(`Tag: ${JSON.stringify(tag)}`),
    );
  }
}

analyzeImageFromFile();

// Function to draw bounding box on an image
async function drawBoundingBox(imagePath, outputImagePath, boundingBox) {
  // Destructure bounding box coordinates
  const { x, y, w, h } = boundingBox;

  // Create an overlay image (transparent rectangle with the bounding box)
  const overlay = await sharp({
    create: {
      width: w,
      height: h,
      channels: 4, // RGBA (4 channels: Red, Green, Blue, Alpha)
      background: { r: 255, g: 0, b: 0, alpha: 0.5 }, // Semi-transparent red box
    },
  })
    .png()
    .toBuffer();

  // Read the original image and overlay the bounding box
  sharp(imagePath)
    .composite([{ input: overlay, top: y, left: x }])
    .toFile(outputImagePath)
    .catch((err) => {
      console.error("Error processing image:", err);
    });
}
