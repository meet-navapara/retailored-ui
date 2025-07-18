import { GraphQLService } from './graphql.service';
import { Demo } from '@/types';

export const UserService = {
  async getUsers(
    search: string | null = null,
    first: number = 10,
    page: number = 1
  ): Promise<{ data: any[]; paginatorInfo: any }> {
    const query = `
      query Users($search: String, $first: Int!, $page: Int) {
        users(search: $search, first: $first, page: $page) {
          paginatorInfo {
            count
            currentPage
            hasMorePages
            lastPage
            perPage
            total
          }
          data {
            id
            fname
            lname
            email
            mobileNumber
            username
            alternateContact
            dob
            gender
            anniversary
            isCustomer
            active
            admsite_code
          }
        }
      }
    `;
  
    const variables = { search, first, page };
    const data = await GraphQLService.query<{ 
      users: {
        paginatorInfo: any;
        data: any[];
      } 
    }>(query, variables);
    
    return {
      data: data.users.data,
      paginatorInfo: data.users.paginatorInfo
    };
  },
  
  async createUser(input: Demo.CreateUserInput): Promise<Demo.User> {
    const mutation = `
      mutation CreateAdminSite($input: AdminSiteInput!) {
        createAdminSite(input: $input) {
          code
          customer {
            id
            fname
            lname
            email
            mobileNumber
            username
            alternateContact
            dob
            gender
            anniversary
            isCustomer
            active
            rlcode
            cmpcode
            admsite_code
            user_type
            ext
          }
        }
      }
    `;

    const transformedInput = {
      cmpcode: input.cmpcode || 1,
      sitename: input.fname,
      site_type: "C",
      create_customer: true,
      customer_info: {
        fname: input.fname,
        lname: input.lname || null,
        email: input.email || null,
        mobileNumber: input.mobileNumber,
        username: input.mobileNumber,
        alternateContact: input.alternateContact || null,
        dob: input.dob || null,
        gender: input.gender,
        anniversary: input.anniversary || null,
        isCustomer: "Y",
        active: input.active ?? 1,
        rlcode: input.rlcode || 1,
        cmpcode: input.cmpcode || null,
        user_type: input.user_type || "E",
        ext: input.ext || "N"
      }
    };

    const data = await GraphQLService.query<{ createAdminSite: { customer: Demo.User } }>(
      mutation, 
      { input: transformedInput }
    );
    return data.createAdminSite.customer;
  },

  async updateUser(id: string, input: Demo.UpdateUserInput): Promise<Demo.User> {
    const mutation = `
      mutation UpdateCustomer($id: ID!, $input: UpdateUserInput!) {
        updateCustomer(id: $id, input: $input) {
          id
          fname
          lname
          email
          mobileNumber
          username
          alternateContact
          dob
          gender
          anniversary
          isCustomer
          active
          rlcode
          cmpcode
          admsite_code
          user_type
          ext
        }
      }
    `;

    const data = await GraphQLService.query<{ updateCustomer: Demo.User }>(
      mutation,
      { id, input }
    );
    return data.updateCustomer;
  },

  async getCustomerInfo(id: string): Promise<any> {
    const query = `
      query CustomerInfo($id: ID!) {
        customerInfo(id: $id) {
          id
          fname
          lname
          email
          mobileNumber
          homeAddress
          dob
          gender
          admsite_code
        }
      }
    `;

    const variables = { id };
    const data = await GraphQLService.query<any>(query, variables);
    return data.customerInfo;
  },

  async getCustomerOrders(admsite_code: string, first: number = 5, page: number = 1): Promise<{ data: any[]; paginatorInfo: any }> {
    const query = `
      query CustomerOrders($id: ID!, $first: Int!, $page: Int!) {
        customerOrders(id: $id, first: $first, page: $page) {
          paginatorInfo {
            count
            currentPage
            hasMorePages
            lastPage
            perPage
            total
          }
          data {
            id
            order_id
            trial_date
            delivery_date
            item_amt
            ord_qty
            delivered_qty
            cancelled_qty
            inProcess_qty
            item_ref
            material {
              id
              name
            }
            orderStatus {
              id
              status_name
            }
          }
        }
      }
    `;

    const variables = { id: admsite_code, first, page };
    const data = await GraphQLService.query<any>(query, variables);
    return {
      data: data.customerOrders.data,
      paginatorInfo: data.customerOrders.paginatorInfo
    };
  }
};