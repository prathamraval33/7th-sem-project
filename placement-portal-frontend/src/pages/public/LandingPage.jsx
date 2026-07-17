import React from "react";
import { Link } from "react-router-dom";
import { Briefcase, Target, Brain, ArrowRight, ShieldCheck } from "lucide-react";
import Button from "../../components/common/Button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center space-x-2 text-slate-800">
          <Briefcase className="w-6 h-6 text-slate-700" />
          <span className="text-xl font-bold font-heading tracking-tight">Placement Portal</span>
        </div>
        <div className="space-x-4">
          <Link to="/contact">
            <Button variant="ghost">Contact Us</Button>
          </Link>
          <Link to="/login">
            <Button variant="outline">Sign In</Button>
          </Link>
          <Link to="/signup/email">
            <Button variant="primary">Sign Up</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="px-6 py-20 text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight font-heading mb-6">
            Your career starts here.
          </h1>
          <p className="text-lg text-slate-600 mb-10 leading-relaxed">
            AI-powered placement preparation, seamless drive applications, and smart career insights exclusively for BVM Engineering students.
          </p>
          <div className="flex justify-center space-x-4">
            <Link to="/signup/email">
              <Button size="lg" className="flex items-center gap-2">
                Get Started <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-white py-20 border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-slate-900 font-heading mb-12">
              Supercharge your placement journey
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-6 border border-slate-100 bg-slate-50 rounded-2xl">
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-slate-700" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2 font-heading">Smart Drive Matching</h3>
                <p className="text-slate-600">
                  Automatically match with placement drives based on your profile, CGPA, and skills. Never miss an opportunity you're eligible for.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 border border-slate-100 bg-slate-50 rounded-2xl">
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-slate-700" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2 font-heading">AI Mock Interviews</h3>
                <p className="text-slate-600">
                  Practice with our Groq-powered AI interviewer tailored to specific companies and tech stacks. Get instant feedback on your weak areas.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 border border-slate-100 bg-slate-50 rounded-2xl">
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-slate-700" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2 font-heading">Secure & Verified</h3>
                <p className="text-slate-600">
                  Exclusive to BVM students. Automated fee receipt verification ensures a fair and transparent application process for everyone.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 py-8 text-center text-slate-400">
        <p className="text-sm">© {new Date().getFullYear()} BVM Engineering Placement Portal. All rights reserved.</p>
      </footer>
    </div>
  );
}
