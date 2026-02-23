import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ReactDOM from 'react-dom/client'
import Home from './pages/Home';
import ResearchResult from './pages/ResearchResult';
import History from './pages/History';
import Navbar from './components/layout/navbar';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar /> 
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/article/:id" element={<ResearchResult />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;