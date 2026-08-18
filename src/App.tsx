import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { MobileNavbar } from '@/components/MobileNavbar';
import { Footer } from '@/components/Footer';
import { Toaster } from '@/components/ui/toaster';
import HomePage from '@/pages/HomePage';
import NovelPage from '@/pages/NovelPage';
import NovelDetailPage from '@/pages/NovelDetailPage';
import GenrePage from '@/pages/GenrePage';
import GenreDetailPage from '@/pages/GenreDetailPage';
import PopularPage from '@/pages/PopularPage';
import LatestPage from '@/pages/LatestPage';
import RankingPage from '@/pages/RankingPage';
import KomunitasPage from '@/pages/KomunitasPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import LibraryPage from '@/pages/LibraryPage';
import AuthorDashboardPage from '@/pages/author/AuthorDashboardPage';
import CreateNovelPage from '@/pages/author/CreateNovelPage';
import ManageNovelsPage from '@/pages/author/ManageNovelsPage';
import EditNovelPage from '@/pages/author/EditNovelPage';
import WriteChapterPage from '@/pages/author/WriteChapterPage';
import { AuthorGuard } from '@/components/auth/AuthorGuard';
import ManageChaptersPage from '@/pages/author/ManageChaptersPage';
import EditChapterPage from '@/pages/author/EditChapterPage';
import ReadChapterPage from '@/pages/ReadChapterPage';


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen flex-col bg-background">
          <Navbar />
          <main className="flex-1 pb-16 lg:pb-0">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/novel" element={<NovelPage />} />
              <Route path="/novel/:id" element={<NovelDetailPage />} />
              <Route path="/genre" element={<GenrePage />} />
              <Route path="/genre/:id" element={<GenreDetailPage />} />
              <Route path="/populer" element={<PopularPage />} />
              <Route path="/terbaru" element={<LatestPage />} />
              <Route path="/ranking" element={<RankingPage />} />
              <Route path="/komunitas" element={<KomunitasPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/profile/:username" element={<ProfilePage />} />
              <Route path="/settings/profile" element={<SettingsPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/read/:chapterId" element={<ReadChapterPage />} />
              <Route path="/rak" element={<LibraryPage />} />
              <Route path="/author/dashboard" element={<AuthorGuard><AuthorDashboardPage /></AuthorGuard>} />
              <Route path="/author/create-novel" element={<AuthorGuard><CreateNovelPage /></AuthorGuard>} />
              <Route path="/author/manage-novels" element={<AuthorGuard><ManageNovelsPage /></AuthorGuard>} />
              <Route path="/author/edit-novel/:id" element={<AuthorGuard><EditNovelPage /></AuthorGuard>} />
              <Route
path="/author/manage-chapters/:novelId"
  element={
    <AuthorGuard>
      <ManageChaptersPage />
    </AuthorGuard>
  }
/>
              <Route
  path="/author/edit-chapter/:chapterId"
  element={
    <AuthorGuard>
      <EditChapterPage />
    </AuthorGuard>
  }
/>
              <Route path="/author/write-chapter" element={<AuthorGuard><WriteChapterPage /></AuthorGuard>} />
            </Routes>
          </main>
          <Footer />
          <MobileNavbar />
          <Toaster />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
