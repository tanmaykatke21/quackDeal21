import React, { useEffect, useState } from 'react';
import { getAnalytics, triggerPipeline } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { Zap, RefreshCw } from 'lucide-react';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pipelineStatus, setPipelineStatus] = useState('');

  useEffect(() => {
    getAnalytics()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleTriggerPipeline = async () => {
    setPipelineStatus('Triggering Databricks pipeline...');
    try {
      const res = await triggerPipeline();
      setPipelineStatus(res.data.success
        ? `✅ Databricks Job #${res.data.runId} started`
        : `❌ Failed: ${res.data.error}`);
    } catch {
      setPipelineStatus('❌ Pipeline trigger failed');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="animate-spin text-blue-500" size={28} />
    </div>
  );

  const { healthByIndustry = [], topObjections = [], healthTrend = [] } = data || {};

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Powered by Snowflake + Databricks</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={handleTriggerPipeline}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Zap size={16} /> Run Databricks Pipeline
          </button>
          {pipelineStatus && <p className="text-xs text-gray-500">{pipelineStatus}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Health Trend Over Time */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4">Deal Health Trend (Snowflake)</h3>
          {healthTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={healthTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="WEEK" tick={{ fontSize: 11 }} tickFormatter={v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="AVG_SCORE" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="Avg Health Score" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">
              No trend data yet — analyze more meetings
            </div>
          )}
        </div>

        {/* Health by Industry */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Avg Health by Industry</h3>
          {healthByIndustry.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={healthByIndustry} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="INDUSTRY" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={v => [`${Math.round(v)}/100`, 'Avg Health']} />
                <Bar dataKey="AVG_HEALTH" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data yet</div>
          )}
        </div>

        {/* Top Objections */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Top Objections (Snowflake)</h3>
          {topObjections.length > 0 ? (
            <div className="space-y-2 overflow-y-auto max-h-52">
              {topObjections.map((obj, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-700 truncate flex-1 mr-3">{obj.PHRASE}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-gray-500">{obj.FREQUENCY}x</span>
                    {obj.LOSS_CORRELATION > 0 && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                        {obj.LOSS_CORRELATION} lost
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No objections tracked yet</div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Analytics;
