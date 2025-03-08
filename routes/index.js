const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const Attendee = require('../models/attendee');
const generatePoster = require('../utils/posterGenerator').generatePoster;
const axios = require('axios');

// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function(req, file, cb) {
    const uniqueId = uuidv4();
    req.body.uniqueId = uniqueId;
    const fileExt = path.extname(file.originalname);
    cb(null, uniqueId + fileExt);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
});

// Check file type
function checkFileType(file, cb) {
  // Allowed extensions
  const filetypes = /jpeg|jpg|png|gif/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images only!');
  }
}

const shortenUrl = async (url) => {
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        return response.data;
    } catch (error) {
        console.error('Error shortening URL:', error);
        return url; // Fallback to the original URL if shortening fails
    }
};

// Home page
router.get('/rang-kasumbal', (req, res) => {
  res.render('index', {
    title: process.env.EVENT_NAME,
    eventDetails: {
      name: process.env.EVENT_NAME,
      date: process.env.EVENT_DATE,
      venue: process.env.EVENT_VENUE,
      time: process.env.EVENT_TIME
    }
  });
});

// Show form page (with referral ID if provided)
router.get('/rang-kasumbal/invite/:id?', async (req, res) => {
  const referrerId = req.params.id;
  let referrer = null;
  
  if (referrerId) {
    try {
      referrer = await Attendee.findOne({ uniqueId: referrerId });
    } catch (err) {
      console.error('Error finding referrer:', err);
    }
  }
  
  res.render('form', {
    title: 'Create Your Invitation',
    referrer: referrer ? referrer.name : null,
    referrerId,
    eventDetails: {
      name: process.env.EVENT_NAME,
      date: process.env.EVENT_DATE,
      venue: process.env.EVENT_VENUE,
      time: process.env.EVENT_TIME
    }
  });
});

// Process form and generate poster
router.post('/rang-kasumbal/generate', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).render('error', { 
        message: 'Please upload an image',
        error: { status: 400 }
      });
    }

    const { name, mobile, uniqueId, referrerId } = req.body;
    const imageUrl = `/uploads/${req.file.filename}`;
    
    // Generate poster
    const posterFilename = `poster-${uniqueId}${path.extname(req.file.filename)}`;
    const posterPath = path.join(__dirname, '../public/uploads', posterFilename);
    const posterUrl = `/uploads/${posterFilename}`;
    
    await generatePoster({
      name,
      imagePath: path.join(__dirname, '../public', imageUrl),
      outputPath: posterPath,
      eventName: process.env.EVENT_NAME,
      eventDate: process.env.EVENT_DATE,
      eventVenue: process.env.EVENT_VENUE,
      eventTime: process.env.EVENT_TIME
    });
    
    // Find referrer if exists
    let referrerId_ObjectId = null;
    if (referrerId) {
      const referrer = await Attendee.findOne({ uniqueId: referrerId });
      if (referrer) {
        referrerId_ObjectId = referrer._id;
        
        // Increment referral count for the referrer
        await Attendee.findByIdAndUpdate(
          referrer._id,
          { $inc: { referralCount: 1 } }
        );
      }
    }
    
    // Save attendee to database
    const attendee = new Attendee({
      name,
      mobile,
      imageUrl,
      posterUrl,
      uniqueId,
      referredBy: referrerId_ObjectId
    });
    
    await attendee.save();
    
    // Show poster
    res.render('poster', {
      title: 'Your Invitation Poster',
      attendee,
      uniqueId,
      shareUrl: `${process.env.BASE_URL}/rang-kasumbal/invite/${uniqueId}`,
      posterUrl,
      eventDetails: {
        name: process.env.EVENT_NAME,
        date: process.env.EVENT_DATE,
        venue: process.env.EVENT_VENUE,
        time: process.env.EVENT_TIME
      }
    });
    
  } catch (err) {
    console.error('Error generating poster:', err);
    res.status(500).render('error', {
      message: 'Error generating poster',
      error: err
    });
  }
});

// Admin dashboard to view referral statistics
router.get('/rang-kasumbal/admin/stats', async (req, res) => {
    try {
      // Get all attendees with referral counts
      let attendees = await Attendee.find()
        .sort({ referralCount: -1 })
        .populate('referredBy', 'name mobile uniqueId');
        
      // Convert to plain objects
      attendees = attendees.map(attendee => attendee.toObject());
        
      // Get total count
      const totalCount = await Attendee.countDocuments();
      
      // Get direct visits (no referral)
      const directCount = await Attendee.countDocuments({ referredBy: null });
      
      // Get top referrers
      let topReferrers = await Attendee.find({ referralCount: { $gt: 0 } })
        .sort({ referralCount: -1 })
        .limit(10);
        
      // Convert to plain objects
      topReferrers = topReferrers.map(referrer => referrer.toObject());
        
      res.render('admin', {
        title: 'Admin Dashboard',
        attendees,
        stats: {
          totalCount,
          directCount,
          referredCount: totalCount - directCount,
          topReferrers
        },
        eventDetails: {
          name: process.env.EVENT_NAME,
          date: process.env.EVENT_DATE,
          venue: process.env.EVENT_VENUE,
          time: process.env.EVENT_TIME
        }
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      res.status(500).render('error', {
        message: 'Error fetching statistics',
        error: err
      });
    }
  });

  // Add this route to your Node.js router
  router.get('/rang-kasumbal/share-whatsapp/:uniqueId', async (req, res) => {
    try {
      const { uniqueId } = req.params;
  
      // Find the attendee with the given uniqueId
      const attendee = await Attendee.findOne({ uniqueId });
  
      if (!attendee) {
        return res.status(404).render('error', {
          message: 'Invitation not found',
          error: { status: 404 }
        });
      }
  
      // Create original URLs
      const shareableUrl = `${process.env.BASE_URL}/rang-kasumbal/invitation/${uniqueId}`;
      const inviteUrl = `${process.env.BASE_URL}/rang-kasumbal/invite/${uniqueId}`;

  
      // Get shortened URLs
      const [shortShareableUrl, shortInviteUrl] = await Promise.all([
        shortenUrl(shareableUrl),
        shortenUrl(inviteUrl)
      ]);
  
      // Construct the message with shortened URLs
      const message = `હું *રંગ કસુંબલ - ૨૦૨૫* કાર્યક્રમમાં હાજર રહેવાનો છું! \nતમે પણ આ રંગીન અને મનમોહક સાંસ્કૃતિક કાર્યક્રમમાં મારી સાથે પધારો. \n\n📍 *સ્થળ*: શ્રી આરૂણી શૈક્ષણિક સંકુલ, સાણથલી \n🗓️ *તારીખ*: ૧૨ માર્ચ, ૨૦૨૫ - સાંજે ૫ઃ૦૦ વાગ્યે \n\nમારું આમંત્રણ અહીંથી જુઓ: ${shortShareableUrl}\n\nતમારું પોતાનું આમંત્રણ બનાવો: ${shortInviteUrl}`;
  
      // Encode the message
      const encodedMessage = encodeURIComponent(message);
  
      // Determine if user is on mobile or desktop based on user agent
      const userAgent = req.headers['user-agent'];
      const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
  
      // Prepare WhatsApp URL
      const whatsappUrl = isMobile
        ? `whatsapp://send?text=${encodedMessage}`
        : `https://web.whatsapp.com/send?text=${encodedMessage}`;
  
      // Redirect the user to WhatsApp
      res.redirect(whatsappUrl);
  
    } catch (err) {
      console.error('Error sharing to WhatsApp:', err);
      res.status(500).render('error', {
        message: 'Error sharing to WhatsApp',
        error: err
      });
    }
  });

  router.get('/rang-kasumbal/invitation/:uniqueId', async (req, res) => {
    try {
      const { uniqueId } = req.params;
      const attendee = await Attendee.findOne({ uniqueId });
      const shareableUrl = `${process.env.BASE_URL}/rang-kasumbal/invitation/${uniqueId}`;
      const shortShareableUrl = await shortenUrl(shareableUrl);
      const postURL = `${process.env.BASE_URL}` + attendee.posterUrl;
      if (!attendee) {
        return res.status(404).render('error', { 
          message: 'Invitation not found',
          error: { status: 404 }
        });
      }
      
      // Render a page with proper Open Graph meta tags
      res.render('invitation', {
        title: `${attendee.name}'s Invitation to ${process.env.EVENT_NAME}`,
        attendee,
        previewUrl: shortShareableUrl,
        posterUrl: postURL,
        baseUrl: process.env.BASE_URL,
        shareUrl: `${process.env.BASE_URL}/rang-kasumbal/invite/${uniqueId}`,
        eventDetails: {
            name: process.env.EVENT_NAME,
            date: process.env.EVENT_DATE,
            venue: process.env.EVENT_VENUE,
            time: process.env.EVENT_TIME
          }

      });
    } catch (err) {
      console.error('Error displaying invitation:', err);
      res.status(500).render('error', {
        message: 'Error displaying invitation',
        error: err
      });
    }
  });

// Add this route to the existing routes/index.js file

// API endpoint to get current referral count
router.get('/rang-kasumbal/api/referral-count/:id', async (req, res) => {
    try {
      const uniqueId = req.params.id;
      const attendee = await Attendee.findOne({ uniqueId });
      
      if (!attendee) {
        return res.status(404).json({ error: 'Attendee not found' });
      }
      
      res.json({ count: attendee.referralCount });
    } catch (err) {
      console.error('Error fetching referral count:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });
module.exports = router;