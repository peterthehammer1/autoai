import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query'
import App from './App'
import { toast } from './hooks/use-toast'
import './index.css'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Something went wrong',
        description: error.message || 'Failed to load data. Please try again.',
      })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
