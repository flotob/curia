{
    "success": true,
    "data": [
        {
            "id": 121,
            "name": "fortran",
            "description": "Simple requirement for ETH holders. Great for Ethereum-based communities.",
            "icon": "⚡",
            "color": "#3b82f6",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [],
                            "ensDomainPatterns": [],
                            "minimumETHBalance": "100000000000000000",
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [],
            "usageCount": 3,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-15T20:11:30.034Z",
            "updatedAt": "2025-06-19T07:05:26.639Z",
            "postsUsingLock": "3",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 116,
            "name": "Mafalda Lock",
            "description": "Require minimum follower count on Universal Profile or EFP.",
            "icon": "👥",
            "color": "#3b82f6",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "42000000000000000000",
                            "requiredTokens": [],
                            "followerRequirements": [
                                {
                                    "type": "minimum_followers",
                                    "value": "100"
                                },
                                {
                                    "type": "followed_by",
                                    "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7",
                                    "description": "feindura"
                                }
                            ]
                        }
                    },
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [
                                {
                                    "type": "minimum_followers",
                                    "value": "3"
                                }
                            ],
                            "ensDomainPatterns": [],
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [],
            "usageCount": 3,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-15T12:23:43.248Z",
            "updatedAt": "2025-06-19T07:12:44.939Z",
            "postsUsingLock": "3",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 83,
            "name": "(\"Token Gate\",\"LUKSO tokens required\") #4",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "requiredTokens": [
                                {
                                    "name": "Unknown Token",
                                    "symbol": "UNK",
                                    "minAmount": "1",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0xb2894bfdac8d21c2098196b2707c738f5533e0a8"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 3,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-15T20:35:20.870Z",
            "postsUsingLock": "2",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 81,
            "name": "(\"Token Gate\",\"LUKSO tokens required\") #2",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "requiredTokens": [
                                {
                                    "name": "Unknown Token",
                                    "symbol": "UNK",
                                    "minAmount": "1000000000000000000",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0xb2894bfdac8d21c2098196b2707c738f5533e0a8"
                                },
                                {
                                    "name": "Unknown Token",
                                    "symbol": "UNK",
                                    "tokenType": "LSP8",
                                    "contractAddress": "0x86E817172b5c07f7036Bf8aA46e2db9063743A83"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 82,
            "name": "(\"Token Gate\",\"LUKSO tokens required\") #3",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "requiredTokens": [
                                {
                                    "name": "Unknown Token",
                                    "symbol": "UNK",
                                    "minAmount": "1000000000000000000",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0xb2894bfdac8d21c2098196b2707c738f5533e0a8"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 84,
            "name": "(\"LYX + Token Gate\",\"Minimum LYX required; LUKSO tokens required\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "47000000000000000000",
                            "requiredTokens": [
                                {
                                    "name": "Unknown Token",
                                    "symbol": "UNK",
                                    "tokenId": "7728",
                                    "tokenType": "LSP8",
                                    "contractAddress": "0x86E817172b5c07f7036Bf8aA46e2db9063743A83"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 85,
            "name": "(\"LYX + Token Gate\",\"Minimum LYX required; LUKSO tokens required\") #2",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "23000000000000000000",
                            "requiredTokens": [
                                {
                                    "name": "Unknown Token",
                                    "symbol": "UNK",
                                    "tokenType": "LSP8",
                                    "contractAddress": "0x2b2eb8848d04c003231e4b905d5db6ebc0c02fa4"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 86,
            "name": "(\"Token Gate\",\"LUKSO tokens required\") #5",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "requiredTokens": [
                                {
                                    "name": "Just a Potato 🥔",
                                    "symbol": "POTATO",
                                    "minAmount": "1000000000000000000",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0x80d898c5a3a0b118a0c8c8adcdbb260fc687f1ce"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 87,
            "name": "(\"LYX + Token Gate\",\"Minimum LYX required; LUKSO tokens required\") #3",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "42000000000000000000",
                            "requiredTokens": [
                                {
                                    "name": "Just a Potato 🥔",
                                    "symbol": "POTATO",
                                    "minAmount": "1000000000000000000",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0x80d898c5a3a0b118a0c8c8adcdbb260fc687f1ce"
                                },
                                {
                                    "name": "💎 Carbon Credits",
                                    "symbol": "CC",
                                    "minAmount": "1000000000000000000000",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0x4c5f927e8abecac8fdcc3bd324ac3792d8266b16"
                                },
                                {
                                    "name": "GM Beans",
                                    "symbol": "GMBEANS",
                                    "minAmount": "1",
                                    "tokenType": "LSP8",
                                    "contractAddress": "0x33517e5fedec388da59125fbabea6e2f6395c510"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 78,
            "name": "(\"LYX Gate\",\"Minimum LYX required\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "40000000000000000000"
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 89,
            "name": "(\"Social Gate\",\"Social requirements\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "followerRequirements": [
                                {
                                    "type": "following",
                                    "value": "0x8363cfe6c787218f0ada0a4abc289a8d9dfc2453"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 90,
            "name": "(\"Social Gate\",\"Social requirements\") #2",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "followerRequirements": [
                                {
                                    "type": "following",
                                    "value": "0x194FD32760Fa818ed2ee712B3354fCDa1121cfB4"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 91,
            "name": "(\"Social Gate\",\"Social requirements\") #3",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "followerRequirements": [
                                {
                                    "type": "followed_by",
                                    "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 92,
            "name": "(\"Social Gate\",\"Social requirements\") #4",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "followerRequirements": [
                                {
                                    "type": "following",
                                    "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 93,
            "name": "(\"LYX + Token +1 Gate\",\"Minimum LYX required; LUKSO tokens required; Social requirements\") #2",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "42000000000000000000",
                            "requiredTokens": [
                                {
                                    "name": "LUKSO OG NFT",
                                    "symbol": "LYXOG",
                                    "minAmount": "1",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0xb2894bfdac8d21c2098196b2707c738f5533e0a8"
                                }
                            ],
                            "followerRequirements": [
                                {
                                    "type": "followed_by",
                                    "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"
                                },
                                {
                                    "type": "following",
                                    "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 94,
            "name": "(\"ENS Gate\",\"ENS domain required\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": true,
                            "efpRequirements": [],
                            "ensDomainPatterns": [
                                "*.eth"
                            ],
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 95,
            "name": "(\"LYX + ENS +1 Gate\",\"Minimum LYX required; ENS domain required; Minimum ETH required\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "3000000000000000000",
                            "requiredTokens": [],
                            "followerRequirements": []
                        }
                    },
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": true,
                            "efpRequirements": [],
                            "ensDomainPatterns": [
                                "*.eth"
                            ],
                            "minimumETHBalance": "10000000000000000",
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 96,
            "name": "(\"ENS + ETH +1 Gate\",\"ENS domain required; Minimum ETH required; Minimum LYX required\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": true,
                            "efpRequirements": [],
                            "ensDomainPatterns": [
                                "florian*.eth"
                            ],
                            "minimumETHBalance": "74415500000000",
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    },
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "4020000000000000000",
                            "requiredTokens": [],
                            "followerRequirements": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 97,
            "name": "(\"ENS + ETH Gate\",\"ENS domain required; Minimum ETH required\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": true,
                            "efpRequirements": [],
                            "ensDomainPatterns": [
                                "*.eth"
                            ],
                            "minimumETHBalance": "74415500000000",
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 98,
            "name": "(\"ENS + LYX Gate\",\"ENS domain required; Minimum LYX required\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": true,
                            "efpRequirements": [],
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    },
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "4020000000000000000",
                            "requiredTokens": [],
                            "followerRequirements": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 99,
            "name": "(\"LYX Gate\",\"Minimum LYX required\") #3",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "42000000000000000000",
                            "requiredTokens": [],
                            "followerRequirements": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 100,
            "name": "(\"ENS + LYX +2 Gate\",\"ENS domain required; Minimum LYX required; LUKSO tokens required; Social requirements\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": true,
                            "efpRequirements": [],
                            "ensDomainPatterns": [
                                "*.eth"
                            ],
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    },
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "4000000000000000000",
                            "requiredTokens": [
                                {
                                    "name": "Unknown Token",
                                    "symbol": "UNK",
                                    "minAmount": "1000000000000000000",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0x650e14f636295af421d9bb788636356aa7f5924c"
                                },
                                {
                                    "name": "Unknown Token",
                                    "symbol": "UNK",
                                    "minAmount": "1",
                                    "tokenType": "LSP8",
                                    "contractAddress": "0x2b2eb8848d04c003231e4b905d5db6ebc0c02fa4"
                                }
                            ],
                            "followerRequirements": [
                                {
                                    "type": "followed_by",
                                    "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 106,
            "name": "(\"Social Gate\",\"EFP requirements\") #3",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [
                                {
                                    "type": "minimum_followers",
                                    "value": "3",
                                    "description": ""
                                },
                                {
                                    "type": "must_be_followed_by",
                                    "value": "",
                                    "description": "caveman.eth (caveman.eth)"
                                }
                            ],
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 101,
            "name": "(\"ENS + ETH +3 Gate\",\"ENS domain required; Minimum ETH required; Minimum LYX required; LUKSO tokens required; Social requirements\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": true,
                            "efpRequirements": [],
                            "ensDomainPatterns": [
                                "*.eth"
                            ],
                            "minimumETHBalance": "7000000000000000",
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    },
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "42000000000000000000",
                            "requiredTokens": [
                                {
                                    "name": "FABS",
                                    "symbol": "FABS",
                                    "minAmount": "10000000000000000000000",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0x650e14f636295af421d9bb788636356aa7f5924c"
                                },
                                {
                                    "name": "burntwhales",
                                    "symbol": "BW",
                                    "minAmount": "1000000000000000000",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0x8bf5bf6c2f11643e75dc4199af2c7d39b1aefcd3"
                                }
                            ],
                            "followerRequirements": [
                                {
                                    "type": "minimum_followers",
                                    "value": "100"
                                },
                                {
                                    "type": "followed_by",
                                    "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"
                                },
                                {
                                    "type": "following",
                                    "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 102,
            "name": "(\"LYX Gate\",\"Minimum LYX required\") #4",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "1020000000000000000",
                            "requiredTokens": [],
                            "followerRequirements": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 103,
            "name": "(\"LYX + Token +1 Gate\",\"Minimum LYX required; LUKSO tokens required; Social requirements\") #3",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "3000000000000000000",
                            "requiredTokens": [
                                {
                                    "name": "burntwhales",
                                    "symbol": "BW",
                                    "minAmount": "1000000000000000000",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0x8bf5bf6c2f11643e75dc4199af2c7d39b1aefcd3"
                                }
                            ],
                            "followerRequirements": [
                                {
                                    "type": "following",
                                    "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 104,
            "name": "(\"Social Gate\",\"EFP requirements\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [
                                {
                                    "type": "must_be_followed_by",
                                    "value": "",
                                    "description": "caveman.eth (caveman.eth)"
                                }
                            ],
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 105,
            "name": "(\"Social Gate\",\"EFP requirements\") #2",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [
                                {
                                    "type": "minimum_followers",
                                    "value": "3",
                                    "description": ""
                                }
                            ],
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 107,
            "name": "(\"Social Gate\",\"EFP requirements\") #4",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [
                                {
                                    "type": "must_follow",
                                    "value": "",
                                    "description": "caveman.eth (caveman.eth)"
                                }
                            ],
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 108,
            "name": "(\"Social Gate\",\"EFP requirements\") #5",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [
                                {
                                    "type": "must_follow",
                                    "value": "0xa8b4756959e1192042fc2a8a103dfe2bddf128e8",
                                    "description": "caveman.eth (caveman.eth)"
                                }
                            ],
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 109,
            "name": "(\"Social Gate\",\"EFP requirements\") #6",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [
                                {
                                    "type": "minimum_followers",
                                    "value": "2",
                                    "description": ""
                                }
                            ],
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 110,
            "name": "(\"Social Gate\",\"EFP requirements\") #7",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [
                                {
                                    "type": "minimum_followers",
                                    "value": "2",
                                    "description": ""
                                },
                                {
                                    "type": "must_follow",
                                    "value": "0xa8b4756959e1192042fc2a8a103dfe2bddf128e8",
                                    "description": "caveman.eth (caveman.eth)"
                                }
                            ],
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 111,
            "name": "(\"ETH + Social Gate\",\"Minimum ETH required; EFP requirements\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [
                                {
                                    "type": "minimum_followers",
                                    "value": "3",
                                    "description": ""
                                },
                                {
                                    "type": "must_be_followed_by",
                                    "value": "0xa8b4756959e1192042fc2a8a103dfe2bddf128e8",
                                    "description": "caveman.eth (caveman.eth)"
                                }
                            ],
                            "minimumETHBalance": "7440000000000000",
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 112,
            "name": "(\"ETH + Token +5 Gate\",\"Minimum ETH required; Ethereum tokens required; NFT ownership required; EFP requirements; Minimum LYX required; LUKSO tokens required; Social requirements\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [
                                {
                                    "type": "minimum_followers",
                                    "value": "3",
                                    "description": ""
                                },
                                {
                                    "type": "must_follow",
                                    "value": "0x52ac12480565555257a77c9f79f5b7ac770cfa09",
                                    "description": "mmmm.eth (mmmm.eth)"
                                },
                                {
                                    "type": "must_be_followed_by",
                                    "value": "0xa8b4756959e1192042fc2a8a103dfe2bddf128e8",
                                    "description": "caveman.eth (caveman.eth)"
                                }
                            ],
                            "minimumETHBalance": "-2000000000000000000",
                            "requiredERC20Tokens": [
                                {
                                    "name": "",
                                    "symbol": "SHIB",
                                    "minimum": "1234",
                                    "decimals": 18,
                                    "contractAddress": "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE"
                                }
                            ],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": [
                                {
                                    "name": "Meebits",
                                    "symbol": "",
                                    "minimumCount": 1,
                                    "contractAddress": "0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7"
                                }
                            ]
                        }
                    },
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "42000000000000000000",
                            "requiredTokens": [
                                {
                                    "name": "Unknown Token",
                                    "symbol": "UNK",
                                    "minAmount": "1000000000000000000",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0x13fe7655c1bef7864dfc206838a20d00e5ce60a1"
                                },
                                {
                                    "name": "Unknown Token",
                                    "symbol": "UNK",
                                    "minAmount": "1",
                                    "tokenType": "LSP8",
                                    "contractAddress": "0x2b2eb8848d04c003231e4b905d5db6ebc0c02fa4"
                                }
                            ],
                            "followerRequirements": [
                                {
                                    "type": "minimum_followers",
                                    "value": "100"
                                },
                                {
                                    "type": "followed_by",
                                    "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"
                                },
                                {
                                    "type": "following",
                                    "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 113,
            "name": "(\"Social Gate\",\"Social requirements\") #5",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "requiredTokens": [],
                            "followerRequirements": [
                                {
                                    "type": "followed_by",
                                    "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 88,
            "name": "(\"LYX + Token +1 Gate\",\"Minimum LYX required; LUKSO tokens required; Social requirements\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "1000000000000000000",
                            "requiredTokens": [
                                {
                                    "name": "LUKSO OG NFT",
                                    "symbol": "LYXOG",
                                    "minAmount": "1",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0xb2894bfdac8d21c2098196b2707c738f5533e0a8"
                                }
                            ],
                            "followerRequirements": [
                                {
                                    "type": "followed_by",
                                    "value": "0xcdec110f9c255357e37f46cd2687be1f7e9b02f7",
                                    "description": "Only the chosen ones"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 79,
            "name": "(\"LYX Gate\",\"Minimum LYX required\") #2",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "50000000000000000000"
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 80,
            "name": "(\"Token Gate\",\"LUKSO tokens required\")",
            "icon": "🔒",
            "color": "#6366f1",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "requiredTokens": [
                                {
                                    "name": "Lukso OG",
                                    "symbol": "LYXOG",
                                    "minAmount": "1000000000000000000",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0xb2894bfdac8d21c2098196b2707c738f5533e0a8"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [
                "migrated",
                "auto-generated"
            ],
            "usageCount": 2,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-13T17:46:11.131Z",
            "updatedAt": "2025-06-13T17:46:11.131Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 122,
            "name": "requireAll lock",
            "icon": "🔒",
            "color": "#3b82f6",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "42000000000000000000",
                            "requiredTokens": [],
                            "followerRequirements": []
                        }
                    },
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": true,
                            "efpRequirements": [],
                            "ensDomainPatterns": [],
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAll": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [],
            "usageCount": 1,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-16T14:58:01.594Z",
            "updatedAt": "2025-06-16T14:58:53.707Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 120,
            "name": "ficken3000",
            "description": "Require minimum follower count on Universal Profile or EFP.",
            "icon": "👥",
            "color": "#3b82f6",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "requiredTokens": [],
                            "followerRequirements": [
                                {
                                    "type": "minimum_followers",
                                    "value": "100"
                                }
                            ]
                        }
                    },
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [
                                {
                                    "type": "must_be_followed_by",
                                    "value": "0xa8b4756959e1192042fc2a8a103dfe2bddf128e8",
                                    "description": "caveman.eth"
                                }
                            ],
                            "ensDomainPatterns": [],
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [],
            "usageCount": 1,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-15T16:03:14.915Z",
            "updatedAt": "2025-06-16T07:48:31.923Z",
            "postsUsingLock": "1",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 124,
            "name": "staked dual gating",
            "description": "Simple requirement for LYX token holders. Perfect for basic token gating.",
            "icon": "💎",
            "color": "#3b82f6",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "fulfillment": "any",
                        "requirements": {
                            "minLyxBalance": "42000000000000000000",
                            "requiredTokens": [
                                {
                                    "name": "Stakingverse Staked LYX (sLYX)",
                                    "symbol": "sLYX",
                                    "minAmount": "42000000000000000000",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0x8a3982f0a7d154d11a5f43eec7f50e52ebbc8f7d"
                                }
                            ],
                            "followerRequirements": []
                        }
                    },
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "fulfillment": "any",
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [],
                            "ensDomainPatterns": [],
                            "minimumETHBalance": "12986711639999999",
                            "requiredERC20Tokens": [
                                {
                                    "name": "Liquid staked Ether 2.0",
                                    "symbol": "stETH",
                                    "minimum": "12986711639999999",
                                    "decimals": 18,
                                    "contractAddress": "0xae7ab96520de3a18e5e111b5eaab095312d7fe84"
                                }
                            ],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAll": false
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [],
            "usageCount": 0,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-19T15:57:06.503Z",
            "updatedAt": "2025-06-19T15:57:06.503Z",
            "postsUsingLock": "0",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 123,
            "name": "Lukso Goat",
            "description": "Simple requirement for LYX token holders. Perfect for basic token gating.",
            "icon": "💎",
            "color": "#3b82f6",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "50000000000000000000",
                            "requiredTokens": [
                                {
                                    "name": "Stakingverse Staked LYX (sLYX)",
                                    "symbol": "sLYX",
                                    "minAmount": "50000000000000000000",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0x8a3982f0a7d154d11a5f43eec7f50e52ebbc8f7d"
                                }
                            ],
                            "followerRequirements": [
                                {
                                    "type": "minimum_followers",
                                    "value": "50"
                                }
                            ]
                        }
                    }
                ],
                "requireAll": false
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [],
            "usageCount": 0,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-16T17:51:53.511Z",
            "updatedAt": "2025-06-16T17:51:53.511Z",
            "postsUsingLock": "0",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 119,
            "name": "VIP Access",
            "description": "High token threshold + follower requirements for premium access.",
            "icon": "⭐",
            "color": "#3b82f6",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "42000000000000000000",
                            "requiredTokens": [
                                {
                                    "name": "CHILL",
                                    "symbol": "CHILL",
                                    "minAmount": "12000000000000000000",
                                    "tokenType": "LSP7",
                                    "contractAddress": "0x5b8b0e44d4719f8a328470dccd3746bfc73d6b14"
                                },
                                {
                                    "name": "Unknown Collection",
                                    "symbol": "UNK",
                                    "minAmount": "2",
                                    "tokenType": "LSP8",
                                    "contractAddress": "0x1d5166e8247e70a2cf01881924a1ac6fc1b91128"
                                }
                            ],
                            "followerRequirements": []
                        }
                    },
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [],
                            "ensDomainPatterns": [],
                            "minimumETHBalance": "1000000000000000000",
                            "requiredERC20Tokens": [
                                {
                                    "name": "USD Coin",
                                    "symbol": "USDC",
                                    "minimum": "12000000",
                                    "decimals": 6,
                                    "contractAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
                                }
                            ],
                            "requiredERC1155Tokens": [
                                {
                                    "name": "Hats Protocol v1",
                                    "minimum": "1",
                                    "tokenId": "0x0000000100020001000100000000000000000000000000000000000000000000",
                                    "contractAddress": "0x3bc1a0ad72417f2d411118085256fc53cbddd137"
                                }
                            ],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [],
            "usageCount": 0,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-15T14:50:53.066Z",
            "updatedAt": "2025-06-15T14:50:53.066Z",
            "postsUsingLock": "0",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 118,
            "name": "LYX Holders Only",
            "description": "Simple requirement for LYX token holders. Perfect for basic token gating.",
            "icon": "💎",
            "color": "#3b82f6",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "50000000000000000000",
                            "requiredTokens": [],
                            "followerRequirements": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [],
            "usageCount": 0,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-15T12:51:39.428Z",
            "updatedAt": "2025-06-15T12:51:39.428Z",
            "postsUsingLock": "0",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 117,
            "name": "Social Followers",
            "description": "Require minimum follower count on Universal Profile or EFP.",
            "icon": "👥",
            "color": "#3b82f6",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "requiredTokens": [],
                            "followerRequirements": [
                                {
                                    "type": "minimum_followers",
                                    "value": "100"
                                }
                            ]
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [],
            "usageCount": 0,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-15T12:41:46.625Z",
            "updatedAt": "2025-06-15T12:41:46.625Z",
            "postsUsingLock": "0",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 115,
            "name": "LYX Holders Onlyasdfadf",
            "description": "Simple requirement for LYX token holders. Perfect for basic token gating.",
            "icon": "💎",
            "color": "#3b82f6",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "universal_profile",
                        "enabled": true,
                        "requirements": {
                            "minLyxBalance": "50000000000000000000",
                            "requiredTokens": [],
                            "followerRequirements": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [],
            "usageCount": 0,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-14T12:10:00.299Z",
            "updatedAt": "2025-06-14T12:10:00.299Z",
            "postsUsingLock": "0",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        },
        {
            "id": 114,
            "name": "Schlumbi",
            "description": "Simple requirement for ETH holders. Great for Ethereum-based communities.",
            "icon": "⚡",
            "color": "#3b82f6",
            "gatingConfig": {
                "categories": [
                    {
                        "type": "ethereum_profile",
                        "enabled": true,
                        "requirements": {
                            "requiresENS": false,
                            "efpRequirements": [],
                            "ensDomainPatterns": [],
                            "minimumETHBalance": "100000000000000000",
                            "requiredERC20Tokens": [],
                            "requiredERC1155Tokens": [],
                            "requiredERC721Collections": []
                        }
                    }
                ],
                "requireAny": true
            },
            "creatorUserId": "86326068-5e1f-41b4-ba39-213402bf3601",
            "communityId": "1e5fb703-1805-42e7-927e-be3f7855856c",
            "isTemplate": false,
            "isPublic": true,
            "tags": [],
            "usageCount": 0,
            "successRate": 0,
            "avgVerificationTime": 0,
            "createdAt": "2025-06-14T08:10:19.716Z",
            "updatedAt": "2025-06-14T08:10:19.716Z",
            "postsUsingLock": "0",
            "isOwned": true,
            "canEdit": true,
            "canDelete": true
        }
    ],
    "pagination": {
        "total": 47,
        "page": 1,
        "limit": 50,
        "hasMore": false
    }
}