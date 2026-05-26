// Utility functions
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('sw-TZ', { year: 'numeric', month: 'long', day: 'numeric' });
};

const extractYouTubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

module.exports = { formatDate, extractYouTubeId };