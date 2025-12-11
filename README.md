### 💻 SupaCRM: An Enterprise-Grade SaaS CRM

**SupaCRM** is a production-ready, secure, multi-role SaaS Customer Relationship Management (CRM) application built with React (Next.js) and Supabase. This project serves as a comprehensive demonstration of full-stack expertise, showcasing advanced authentication flows, fine-grained access control with Row-Level Security (RLS), and a modular, scalable architecture ready for real-world use.

---

### **🚀 Key Features & Enterprise Capabilities**

This application was designed to solve complex business requirements, demonstrating a professional approach to software development.

- **Multi-role access:** Implements a robust permission system with `super_admin`, `admin`, `agent`, and `user` roles.
- **Supabase Auth:** Utilizes industry-standard authentication via OAuth and Magic Link.
- **Row-Level Security (RLS):** Enforces fine-grained access policies directly at the database level, ensuring data is only visible to authorized users.
- **Full CRUD Functionality:** Manages core CRM data including Companies, Contacts, Deals, Tasks, and Files.
- **Secure File Storage:** Integrates with Supabase Storage for secure file uploads and downloads, with access restricted by RLS policies.
- **Protected Routes:** Ensures a secure user experience with role-based navigation and UI components.
- **Cross-platform Compatibility:** Addresses and resolves a known cross-platform authentication bug, showcasing advanced problem-solving skills.
- **Modular Architecture:** Features a clean, reusable codebase with custom hooks, components, and context for long-term maintainability.

---

### **🧱 Architecture & Core Technologies**

This project is structured as a monorepo to manage both the frontend and backend components seamlessly. The architecture highlights an understanding of building a cohesive, full-stack application.

| Layer              | Technology                            | Rationale                                                                                                                             |
| :----------------- | :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend**       | React (Next.js)                       | A leading framework for building high-performance, server-side rendered UIs.                                                          |
| **Backend**        | Supabase                              | A powerful Backend-as-a-Service (BaaS) providing a Postgres database, authentication, and file storage in a single, managed platform. |
| **Authentication** | Supabase Auth                         | Provides secure, managed user authentication, reducing development overhead.                                                          |
| **Security**       | Supabase RLS                          | Enforces granular data access policies, a best practice for data integrity.                                                           |
| **Storage**        | Supabase Storage                      | A secure and scalable solution for file management.                                                                                   |
| **Hosting**        | Render (Frontend), Supabase (Backend) | Demonstrates proficiency in deploying a modern web application and configuring its backend services.                                  |

---

### **🛡️ Security & Data Integrity**

The security model is a core highlight of this project. Supabase's **Row-Level Security (RLS)** is leveraged to provide a secure and scalable foundation. Each user's data access is strictly limited based on their role and ID, making it a powerful demonstration of database-level access control.

---

---

### **📚 Codebase & Documentation**

- **Database Schema:** The complete database schema is documented in [`database/schema.sql`](https://www.google.com/search?q=database/schema.sql).
- **Security Policies:** All RLS policies are clearly defined in [`src/lib/rls-policies.sql`](https://www.google.com/search?q=src/lib/rls-policies.sql), providing a transparent view of the security model.
- **Modular Code:** The codebase is organized with reusable hooks (`useAuth.tsx`, `useCRUD.tsx`) and components, demonstrating a commitment to a clean and maintainable architecture.

---

### **📧 Contact**

Questions or feedback? Please open an issue on the repository or reach out.
