export const getTwoDigitsDate = () => {
  const dateObj = new Date();
  const year = dateObj.getUTCFullYear();
  const month = `0${dateObj.getUTCMonth() + 1}`.slice(-2);
  const day = `0${dateObj.getUTCDate()}`.slice(-2);

  return {
    year,
    month,
    day
  };
};
