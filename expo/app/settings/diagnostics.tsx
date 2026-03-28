import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Server, CheckCircle, XCircle, RefreshCw } from 'lucide-react-native';

export default function DiagnosticsScreen() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    setTesting(true);
    const tests: any = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    // Test 1: Basic internet connectivity
    try {
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
      });
      tests.tests.internet = { status: 'pass', message: 'Internet connected' };
    } catch (error: any) {
      tests.tests.internet = { status: 'fail', message: error.message };
    }

    // Test 2: Backend health endpoint
    try {
      const baseUrl = 'https://8e23p8rts6cegks6ymhco.rork.com';
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        tests.tests.backendHealth = { 
          status: 'pass', 
          message: 'Backend is healthy',
          data,
        };
      } else {
        tests.tests.backendHealth = { 
          status: 'fail', 
          message: `Backend returned status ${response.status}`,
        };
      }
    } catch (error: any) {
      tests.tests.backendHealth = { 
        status: 'fail', 
        message: `Backend health check failed: ${error.message}`,
      };
    }

    // Test 3: Backend root endpoint
    try {
      const baseUrl = 'https://8e23p8rts6cegks6ymhco.rork.com';
      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        tests.tests.backendRoot = { 
          status: 'pass', 
          message: 'Backend root responding',
          data,
        };
      } else {
        tests.tests.backendRoot = { 
          status: 'fail', 
          message: `Backend returned status ${response.status}`,
        };
      }
    } catch (error: any) {
      tests.tests.backendRoot = { 
        status: 'fail', 
        message: `Backend root check failed: ${error.message}`,
      };
    }

    // Test 4: tRPC endpoint basic connectivity
    try {
      const baseUrl = 'https://8e23p8rts6cegks6ymhco.rork.com';
      const response = await fetch(`${baseUrl}/api`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        tests.tests.trpcEndpoint = { 
          status: 'pass', 
          message: 'tRPC endpoint accessible',
          data,
        };
      } else {
        tests.tests.trpcEndpoint = { 
          status: 'fail', 
          message: `tRPC endpoint returned status ${response.status}`,
        };
      }
    } catch (error: any) {
      tests.tests.trpcEndpoint = { 
        status: 'fail', 
        message: `tRPC endpoint check failed: ${error.message}`,
      };
    }

    setResults(tests);
    setTesting(false);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Backend Diagnostics',
          headerStyle: { backgroundColor: '#1e293b' },
          headerTintColor: '#fff',
        }}
      />
      
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Server size={48} color="#3b82f6" />
          <Text style={styles.title}>Backend Diagnostics</Text>
          <Text style={styles.subtitle}>
            Test connectivity to backend services
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, testing && styles.buttonDisabled]}
          onPress={runDiagnostics}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <RefreshCw size={20} color="#fff" />
          )}
          <Text style={styles.buttonText}>
            {testing ? 'Running Tests...' : 'Run Diagnostics'}
          </Text>
        </TouchableOpacity>

        {results && (
          <View style={styles.results}>
            <Text style={styles.resultsTitle}>Test Results</Text>
            <Text style={styles.timestamp}>{results.timestamp}</Text>

            {Object.entries(results.tests).map(([key, test]: [string, any]) => (
              <View key={key} style={styles.testResult}>
                <View style={styles.testHeader}>
                  {test.status === 'pass' ? (
                    <CheckCircle size={20} color="#22c55e" />
                  ) : (
                    <XCircle size={20} color="#ef4444" />
                  )}
                  <Text style={styles.testName}>{key}</Text>
                </View>
                <Text style={[
                  styles.testMessage,
                  test.status === 'pass' ? styles.testPass : styles.testFail
                ]}>
                  {test.message}
                </Text>
                {test.data && (
                  <Text style={styles.testData}>
                    {JSON.stringify(test.data, null, 2)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.infoTitle}>Backend URL</Text>
          <Text style={styles.infoText}>
            https://8e23p8rts6cegks6ymhco.rork.com
          </Text>
          
          <Text style={styles.infoTitle}>Expected Endpoints</Text>
          <Text style={styles.infoText}>• GET /health - Health check</Text>
          <Text style={styles.infoText}>• GET / - Root endpoint</Text>
          <Text style={styles.infoText}>• GET /api - API status</Text>
          <Text style={styles.infoText}>• POST /api/trpc/* - tRPC endpoints</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#3b82f6',
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    marginHorizontal: 24,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  testResult: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 8,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  testName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  testMessage: {
    fontSize: 13,
    marginLeft: 28,
  },
  testPass: {
    color: '#22c55e',
  },
  testFail: {
    color: '#ef4444',
  },
  testData: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    marginLeft: 28,
    fontFamily: 'monospace',
  },
  info: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 4,
  },
});
