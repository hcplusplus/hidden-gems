

function getSessionStorageItem(key) {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting session storage item with key "${key}":`, error);
      return null;
    }
  }