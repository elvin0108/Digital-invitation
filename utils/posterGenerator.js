const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

async function generatePoster({ name, imagePath, outputPath}) {
  try {
    // Read the HTML template
    const templatePath = path.join(__dirname, '../public/uploads/poster-template.html');
    let htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    
    // Get the relative path to the image from the public directory
    const relativeImagePath = imagePath.replace(path.join(__dirname, '../public/uploads'), '.');
    
    // Replace placeholders with actual data
    htmlTemplate = htmlTemplate
      .replace('##_Student_Image_##', relativeImagePath)
      .replace('##_Student_Name_##', name);
    
    // Create a temporary HTML file
    const tempHtmlPath = path.join(__dirname, '../public/uploads', `poster-${Date.now()}.html`);
    fs.writeFileSync(tempHtmlPath, htmlTemplate);
    
    // Launch puppeteer to render the HTML
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Open the HTML file
    await page.goto(`file://${tempHtmlPath}`);
    
    // Wait for images to load
    await page.waitForSelector('.overlay-image', { visible: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Take a screenshot
    await page.screenshot({
      path: outputPath,
      fullPage: true,
      omitBackground: true
    });
    
    // Close browser and clean up
    await browser.close();
    fs.unlinkSync(tempHtmlPath); // Delete temporary HTML file
    
    return outputPath;
  } catch (err) {
    console.error('Error in poster generation:', err);
    throw err;
  }
}

module.exports = generatePoster;