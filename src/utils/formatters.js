// Định dạng số tiền sang chuẩn USD ($)
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
  return `$${amount.toFixed(2)}`;
};

// Định dạng ngày giờ hiển thị thân thiện
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN');
};
