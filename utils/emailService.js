const nodemailer = require("nodemailer");

// Create transporter (using Gmail as example)
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send order confirmation email
const sendOrderConfirmation = async (userEmail, orderDetails) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: `Order Confirmation - #${orderDetails.orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Thank you for your order!</h2>
          <p>Your order has been confirmed and is being processed.</p>
          
          <h3>Order Details:</h3>
          <p><strong>Order ID:</strong> #${orderDetails.orderId}</p>
          <p><strong>Total Amount:</strong> $${orderDetails.totalPrice}</p>
          <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
          
          <h3>Shipping Address:</h3>
          <p>${orderDetails.shippingAddress.address}<br>
          ${orderDetails.shippingAddress.city}, ${
        orderDetails.shippingAddress.postalCode
      }<br>
          ${orderDetails.shippingAddress.country}</p>
          
          <hr style="border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Order confirmation email sent to:", userEmail);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send confirmation email");
  }
};

// Send password reset email
const sendPasswordResetEmail = async (userEmail, resetToken) => {
  try {
    const transporter = createTransporter();
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Password Reset Request</h2>
          <p>You requested to reset your password. Click the link below to proceed:</p>
          
          <a href="${resetURL}" 
             style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; 
                    color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Reset Password
          </a>
          
          <p style="color: #666; font-size: 14px;">
            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Password reset email sent to:", userEmail);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};

// Send welcome email
const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "Welcome to Our E-commerce Store!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Welcome aboard, ${userName}! 🎉</h2>
          <p>Thank you for creating an account with us. We're excited to have you as a customer!</p>
          
          <p>Start shopping now and discover amazing products:</p>
          <a href="${process.env.FRONTEND_URL}/products" 
             style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; 
                    color: white; text-decoration: none; border-radius: 4px;">
            Browse Products
          </a>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Happy shopping!<br>
            The E-commerce Team
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Welcome email sent to:", userEmail);
  } catch (error) {
    console.error("Error sending welcome email:", error);
    // Don't throw error for welcome email - it's not critical
  }
};

module.exports = {
  sendOrderConfirmation,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
