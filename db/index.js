const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://bybadmin:7bbR1NKvqELcXnCR@cluster0.74ehpdr.mongodb.net/?retryWrites=true&w=majoritying', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      writeConcern: {
        w: 'majority'
      }
    });

    console.log('MongoDB is connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
