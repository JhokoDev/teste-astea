import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Lazy Supabase Admin Client
  let supabaseAdminClient: any = null;
  const getSupabaseAdmin = () => {
    if (!supabaseAdminClient) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error("Supabase configuration is missing. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the Settings menu.");
      }
      
      supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }
    return supabaseAdminClient;
  };

  // API endpoint for bulk user creation (Admin only)
  app.post("/api/dev/bulk-users", async (req, res) => {
    const { role, startIndex, quantity } = req.body;

    try {
      const admin = getSupabaseAdmin();
      const createdUsers = [];
      for (let i = startIndex; i < startIndex + quantity; i++) {
        const name = `${role}_${i}`;
        const email = `${role}_${i}@astea.test`;
        const password = "mudar123";

        // 1. Create user in auth.users
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: name }
        });

        if (authError) throw authError;

        // 2. Create user in public.users (if not already handled by a trigger)
        const { error: publicError } = await admin.from('users').insert({
          uid: authData.user.id,
          email: email,
          displayname: name,
          role: role,
          institutionid: 'default-inst',
          photourl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
        });

        if (publicError) {
          console.warn(`Warning: Could not create public profile for ${email}:`, publicError.message);
        }

        createdUsers.push({ id: authData.user.id, email, name });
      }

      res.json({ success: true, count: createdUsers.length, users: createdUsers });
    } catch (error: any) {
      console.error("Error in bulk user creation:", error);
      res.status(500).json({ error: error.message || "Failed to create bulk users" });
    }
  });

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
    console.log("Running in DEVELOPMENT mode");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in PRODUCTION mode");
    const distPath = path.join(process.cwd(), 'dist');
    
    // Serve static files with long-term caching for assets
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true
    }));
    
    // Serve other static files from dist
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          // Prevent caching of HTML files to ensure users always get the latest build
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));

    // SPA fallback
    app.get('*', (req, res) => {
      // If it looks like an asset request but reached here, it's a 404
      if (req.path.startsWith('/assets/')) {
        return res.status(404).send('Asset not found');
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
