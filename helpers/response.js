/**
 * Response Helpers
 * ฟังก์ชันช่วยเหลือสำหรับการตอบกลับ API
 */

const { HTTP_STATUS } = require('../constants');

/**
 * Success Response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const successResponse = (res, data = null, message = 'Success', statusCode = HTTP_STATUS.OK) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Error Response
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {number} statusCode - HTTP status code
 * @param {*} details - Additional error details
 */
const errorResponse = (res, error = 'Internal Server Error', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) => {
  const response = {
    success: false,
    error,
    timestamp: new Date().toISOString()
  };

  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Validation Error Response
 * @param {Object} res - Express response object
 * @param {Array} errors - Validation errors array
 */
const validationErrorResponse = (res, errors) => {
  return res.status(HTTP_STATUS.BAD_REQUEST).json({
    success: false,
    error: 'Validation Error',
    errors,
    timestamp: new Date().toISOString()
  });
};

/**
 * Paginated Response
 * @param {Object} res - Express response object
 * @param {Array} data - Response data array
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 */
const paginatedResponse = (res, data, pagination, message = 'Success') => {
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit)
    },
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse
};