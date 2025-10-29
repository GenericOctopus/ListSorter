export const environment = {
  production: false,
  appwrite: {
    endpoint: 'http://localhost/v1', // Change to your AppWrite endpoint
    projectId: 'YOUR_PROJECT_ID',    // Replace with your AppWrite project ID
    databaseId: 'list-sorter-db',
    collectionsId: {
      lists: 'lists'
    }
  }
};
