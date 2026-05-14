import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';

const Writing = lazy(() => import('./pages/Writing.jsx'));
const Reading = lazy(() => import('./pages/Reading.jsx'));
const Listening = lazy(() => import('./pages/Listening.jsx'));
const Vocab = lazy(() => import('./pages/Vocab.jsx'));
const Speaking = lazy(() => import('./pages/Speaking.jsx'));

function PageFallback() {
  return <div className="text-slate-400">加载中...</div>;
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/writing" element={<Writing />} />
          <Route path="/reading" element={<Reading />} />
          <Route path="/listening" element={<Listening />} />
          <Route path="/vocab" element={<Vocab />} />
          <Route path="/speaking" element={<Speaking />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
