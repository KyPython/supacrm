import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">SupaCRM</h1>
            <div>
              <Link
                href="/auth/login"
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded mr-2"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Secure Multi-Role SaaS</span>
              <span className="block text-blue-600">
                Built with Next.js & Supabase
              </span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              A powerful CRM solution with advanced role-based security, storage
              management, and intuitive dashboard.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 max-w-5xl mx-auto">
              {/* Feature 1 */}
              <div className="p-6 bg-white rounded-lg shadow-md">
                <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-blue-100 rounded-lg">
                  <img
                    src="/globe.svg"
                    alt="Role-based security"
                    className="w-6 h-6"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">Role-Based Security</h3>
                <p className="text-gray-600">
                  Granular permissions with Supabase RLS for admins, agents, and
                  users
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 bg-white rounded-lg shadow-md">
                <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-blue-100 rounded-lg">
                  <img src="/file.svg" alt="File storage" className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Secure File Storage</h3>
                <p className="text-gray-600">
                  Upload, manage, and share files with role-based access
                  controls
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 bg-white rounded-lg shadow-md">
                <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-blue-100 rounded-lg">
                  <img
                    src="/window.svg"
                    alt="Cross-platform"
                    className="w-6 h-6"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">Cross-Platform</h3>
                <p className="text-gray-600">
                  Works seamlessly across all devices, including Windows
                  authentication fixes
                </p>
              </div>
            </div>

            <div className="mt-10 max-w-md mx-auto sm:flex sm:justify-center md:mt-16">
              <div className="rounded-md shadow">
                <Link
                  href="/auth/signup"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                >
                  Get started
                </Link>
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <Link
                  href="/auth/login"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-50 mt-16">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">
            SupaCRM — Secure Multi-Role SaaS with React + Supabase
          </p>
        </div>
      </footer>
    </div>
  );
}
