// jobs/videoProcessor.js

const processVideo = async (teachingId, videoUrl) => {
  console.log(
    `Processing video for teaching ${teachingId}: ${videoUrl}`
  );

  // hapa unaweza kuongeza:
  // thumbnail generation
  // metadata extraction
  // duration update

  return {
    done: true,
    teachingId,
    videoUrl,
  };
};

module.exports = {
  processVideo,
};