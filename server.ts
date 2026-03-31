import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mailpit transporter (SMTP on port 1025)
  // Note: The user mentioned Mailpit for testing in an isolated clone.
  const transporter = nodemailer.createTransport({
    host: "localhost",
    port: 1025,
    secure: false,
    tls: {
      rejectUnauthorized: false
    }
  });

  // API endpoint for sending confirmation email
  app.post("/api/send-confirmation", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      await transporter.sendMail({
        from: "noreply@astea.local",
        to: email,
        subject: "Confirmação de conta",
        text: "Sua conta foi criada com sucesso",
      });
      console.log(`Confirmation email sent to ${email}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error sending email:", error);
      // We still return 200/success in some cases if we don't want to block the UI, 
      // but here we return 500 to indicate failure in the test environment.
      res.status(500).json({ error: "Failed to send email", details: error });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
