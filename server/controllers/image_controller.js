
// router
let route = require('express').Router();
let database = require('../database');
const fs = require("fs");

// TODO: Test this.
route.post('/upload', async (req, res) => {
    // get image data from request and check if it is valid
    let image = req.body.image;
    let imageNotNull = image != null;
    let imageNotEmpty = image?.length > 0;
    if (!imageNotNull || !imageNotEmpty) {
        res.status(400).json({success: false, error: "Invalid image"});
        return;
    }
    //check if data is valid for image file
    let imageFile = Buffer.from(image, 'base64');
    let imageFileNotNull = imageFile != null;
    let imageFileNotEmpty = imageFile?.length > 0;
    if (!imageFileNotNull || !imageFileNotEmpty) {
        res.status(400).json({success: false, error: "Invalid image file"});
        return;
    }

    // save image locally named by md5 hash of image file
    let hash = md5(imageFile);
    let imagePath = path.join(__dirname, '..', 'images', hash);
    fs.writeFileSync(imagePath, imageFile);

    // save image to database
    let success = await database.saveImage(hash);
    res.json({success: success});
});

// get image by filename
route.get('/:filename', async (req, res) => {
    let filename = req.params.filename;
    let filepath = path.join(__dirname, '../images', filename);
    let image = fs.readFileSync(filepath);
    res.send(image);
});