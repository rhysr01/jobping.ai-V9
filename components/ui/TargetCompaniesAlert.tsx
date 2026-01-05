"use client";

import { motion } from "framer-motion";
import Button from "./Button";

interface TargetCompany {
  company: string;
  lastMatchedAt: string;
  matchCount: number;
  roles: string[];
}

interface TargetCompaniesAlertProps {
  companies: TargetCompany[];
  message: string;
  onSetAlert: (company: string) => void;
}

export default function TargetCompaniesAlert({
  companies,
  message,
  onSetAlert,
}: TargetCompaniesAlertProps) {
  if (companies.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 text-brand-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>Alert icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">
            Target Companies
          </h3>
          <p className="text-sm text-zinc-400 mb-4">{message}</p>

          <div className="space-y-3">
            {companies.map((company) => (
              <div
                key={company.company}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
              >
                <div className="flex-1">
                  <p className="font-medium text-white">{company.company}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {company.matchCount} matches in last 30 days • Last:{" "}
                    {new Date(company.lastMatchedAt).toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {company.roles.slice(0, 2).map((role, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 bg-zinc-700/50 rounded text-zinc-300"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() => onSetAlert(company.company)}
                  variant="secondary"
                  size="sm"
                >
                  Set Alert
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
