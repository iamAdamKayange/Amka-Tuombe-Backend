// Placeholder for video processing (e.g., extract duration, generate thumbnail)
// You can integrate with youtube-dl or Cloudinary video info API

const getYouTubeId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

module.exports = { getYouTubeId };