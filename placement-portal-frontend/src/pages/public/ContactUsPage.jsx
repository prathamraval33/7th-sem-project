import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { contactUsSchema } from "../../utils/validators";
import { contactApi } from "../../api/contact.api";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

export default function ContactUsPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm({
    resolver: zodResolver(contactUsSchema),
    defaultValues: {
      category: "general"
    }
  });

  const onSubmit = async (data) => {
    try {
      setSubmitError("");
      await contactApi.submitContactForm(data);
      setIsSuccess(true);
      reset();
    } catch (err) {
      setSubmitError(err.response?.data?.detail || "Failed to submit message. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
        </Link>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900 font-heading mb-2">Contact Us</h1>
          <p className="text-slate-600 text-sm mb-6">
            Have a question? Fill out the form below and we'll get back to you as soon as possible.
          </p>

          {isSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Message Sent!</h3>
              <p className="text-sm text-slate-600 mb-6">Thank you for reaching out. We will get back to you shortly.</p>
              <Button onClick={() => setIsSuccess(false)} variant="outline" className="w-full">
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {submitError && (
                <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg">
                  {submitError}
                </div>
              )}
              
              <Input
                label="Full Name"
                placeholder="John Doe"
                {...register("name")}
                error={errors.name?.message}
              />
              
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                error={errors.email?.message}
              />

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Category</label>
                <select
                  {...register("category")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="general">General Inquiry</option>
                  <option value="placement">Placement Related</option>
                </select>
                {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Message</label>
                <textarea
                  {...register("message")}
                  rows="4"
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 ${errors.message ? "border-red-500 focus:ring-red-500" : "border-slate-300"}`}
                  placeholder="How can we help you?"
                />
                {errors.message && <p className="text-sm text-red-500">{errors.message.message}</p>}
              </div>

              <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
                Send Message
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
